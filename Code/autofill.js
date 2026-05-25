// autofill.js — Injected into page to fill form fields
// Runs in page context via chrome.scripting.executeScript

(function() {

  // ── Field map ─────────────────────────────────────────────────────────────
  // Matching layers (in order):
  //   1. Token signals  — field name/id contains a known token (strict boundary match)
  //   2. Label keywords — visible label text contains a known keyword phrase

  const FIELD_MAP = [
    { key: 'firstName',  signals: ['first_name', 'firstname', 'fname', 'given_name'],
                         keywords: ['first name', 'given name'] },
    { key: 'lastName',   signals: ['last_name', 'lastname', 'lname', 'family_name', 'surname'],
                         keywords: ['last name', 'family name', 'surname'] },
    { key: 'fullName',   signals: ['full_name', 'fullname', 'your_name', 'applicant_name'],
                         keywords: ['full name', 'your name'] },

    { key: 'phoneCountryCode', signals: ['country_code', 'phone_country', 'dial_code', 'calling_code', 'country_dial', 'phone_country_code'],
                               keywords: ['country code', 'dial code', 'calling code'] },
    { key: 'phone',      signals: ['phone_number', 'phonenumber', 'phone_num', 'mobile_number', 'cell_number', 'phone', 'telephone', 'mobile', 'cell'],
                         keywords: ['phone number', 'mobile number', 'telephone'] },
    { key: 'email',      signals: ['email', 'email_address', 'emailaddress'],
                         keywords: ['email address', 'email'] },

    { key: 'address',    signals: ['address', 'street', 'address_1', 'address1', 'street_address'],
                         keywords: ['street address', 'address line'] },
    { key: 'city',       signals: ['city', 'town', 'municipality'],
                         keywords: ['city', 'town'] },
    { key: 'state',      signals: ['state', 'province'],
                         keywords: ['state', 'province'] },
    { key: 'zip',        signals: ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postcode'],
                         keywords: ['zip code', 'postal code'] },
    { key: 'country',    signals: ['country', 'nation', 'country_name'],
                         keywords: ['country'] },

    { key: 'linkedin',   signals: ['linkedin', 'linkedin_url', 'linkedin_profile'],
                         keywords: ['linkedin'] },
    { key: 'website',    signals: ['website', 'portfolio', 'personal_website', 'personal_site'],
                         keywords: ['website', 'portfolio', 'personal site'] },
    { key: 'github',     signals: ['github', 'github_url', 'github_profile'],
                         keywords: ['github'] },

    { key: 'requiresSponsorshipFuture', signals: ['sponsorship_future', 'future_sponsor', 'require_sponsorship_in_future', 'sponsorship_in_the_future'],
                                        keywords: ['require sponsorship in the future', 'need sponsorship in future', 'future visa sponsorship'] },
    { key: 'requiresSponsorship',       signals: ['require_sponsorship', 'need_sponsorship', 'requires_sponsorship', 'needs_sponsorship', 'sponsorship_now', 'sponsorship_required'],
                                        keywords: ['require visa sponsorship', 'need sponsorship', 'require sponsorship'] },
    { key: 'sponsorshipAny',            signals: ['sponsorship', 'visa_sponsorship'],
                                        keywords: ['sponsorship'] },
    { key: 'workAuth',                  signals: ['work_authorization', 'work_auth', 'authorized_to_work', 'legally_authorized', 'eligible_to_work', 'work_eligibility'],
                                        keywords: ['authorized to work', 'work authorization', 'legally authorized', 'eligible to work'] },

    { key: 'sexualOrient', signals: ['sexual_orientation', 'sexual_identity', 'sexuality', 'lgbtq'],
                           keywords: ['sexual orientation', 'sexual identity', 'lgbtq'] },
    { key: 'gender',       signals: ['gender', 'gender_identity'],
                           keywords: ['gender identity', 'gender'] },
    { key: 'race',         signals: ['race', 'ethnicity', 'race_ethnicity'],
                           keywords: ['race', 'ethnicity', 'racial'] },
    { key: 'disability',   signals: ['disability', 'disability_status'],
                           keywords: ['disability', 'disabled'] },
    { key: 'veteran',      signals: ['veteran', 'veteran_status', 'protected_veteran', 'vet_status'],
                           keywords: ['veteran status', 'military service', 'protected veteran'] },
  ];

  const EEO_KEYS = new Set(['gender', 'race', 'sexualOrient', 'disability', 'veteran']);
  const INFERRED_NO_SPONSORSHIP = new Set(['US Citizen', 'Green Card']);

  // ── EEO synonym map ───────────────────────────────────────────────────────
  // Maps each standardized stored value to an ordered list of match strategies.
  // Each strategy is a function(optionText) → bool.
  // Strategies are tried in order; first match wins.
  // If NO option matches any strategy → leave blank, highlight yellow.

  function has(text, ...words) {
    return words.every(w => text.includes(w));
  }
  function hasAny(text, ...words) {
    return words.some(w => text.includes(w));
  }

  const EEO_SYNONYMS = {

    gender: {
      'Male':                [(t) => t === 'male', (t) => has(t, 'male') && !has(t, 'female') && !has(t, 'trans')],
      'Female':              [(t) => t === 'female', (t) => has(t, 'female') && !has(t, 'male') && !has(t, 'trans')],
      'Non-Binary':          [(t) => hasAny(t, 'non-binary', 'non binary', 'nonbinary', 'genderqueer', 'gender non')],
      'Self-Describe':       [(t) => hasAny(t, 'self-describe', 'self describe', 'different identity', 'write in', 'other')],
      'Do not wish to answer': [(t) => hasAny(t, 'do not wish', 'prefer not', 'decline', 'choose not', 'not disclose', 'no answer')],
    },

    sexualOrient: {
      'Heterosexual':        [(t) => hasAny(t, 'heterosexual', 'straight')],
      'Gay or Lesbian':      [(t) => hasAny(t, 'gay', 'lesbian', 'homosexual')],
      'Bisexual':            [(t) => has(t, 'bisexual')],
      'Self-Describe':       [(t) => hasAny(t, 'self-describe', 'self describe', 'different identity', 'write in', 'other')],
      'Do not wish to answer': [(t) => hasAny(t, 'do not wish', 'prefer not', 'decline', 'choose not', 'not disclose', 'no answer')],
    },

    race: {
      // Multiple strategies per key — tried in order, first match wins.
      // Specific ethnic terms first, then fallback to generic "Asian" option.
      'East Asian':          [(t) => hasAny(t, 'east asian', 'chinese', 'japanese', 'korean', 'taiwanese'),
                              (t) => has(t, 'asian') && !has(t, 'south') && !has(t, 'southeast')],
      'Southeast Asian':     [(t) => hasAny(t, 'southeast asian', 'filipino', 'vietnamese', 'thai', 'indonesian', 'cambodian', 'laotian'),
                              (t) => has(t, 'asian') && !has(t, 'south') && !has(t, 'east')],
      'South Asian':         [(t) => hasAny(t, 'south asian', 'indian', 'pakistani', 'bangladeshi', 'sri lankan', 'nepalese'),
                              (t) => has(t, 'asian')],
      'Native American':     [(t) => hasAny(t, 'native american', 'alaska native', 'american indian', 'indigenous', 'first nation')],
      'Black':               [(t) => hasAny(t, 'black', 'african american')],
      'White':               [(t) => has(t, 'white') && !has(t, 'non-white')],
      'Hispanic':            [(t) => hasAny(t, 'hispanic', 'latino', 'latina', 'latinx', 'latin american')],
      'Middle Eastern':      [(t) => hasAny(t, 'middle eastern', 'north african', 'mena', 'arab')],
      'Pacific Islander':    [(t) => hasAny(t, 'pacific islander', 'native hawaiian', 'samoan', 'chamorro', 'tongan')],
      'Two or more':         [(t) => hasAny(t, 'two or more', 'multiracial', 'multi-racial', 'biracial', 'multiple')],
      'Self-Describe':       [(t) => hasAny(t, 'self-describe', 'self describe', 'different identity', 'write in', 'other')],
      'Do not wish to answer': [(t) => hasAny(t, 'do not wish', 'prefer not', 'decline', 'choose not', 'not disclose', 'no answer')],
    },

    veteran: {
      'Not a veteran':       [(t) => hasAny(t, 'not a veteran', 'not a protected', 'i am not', 'no, i', 'non-veteran', 'non veteran', 'not a vet'),
                              (t) => t === 'no'],
      'Protected veteran':   [(t) => hasAny(t, 'protected veteran', 'i am a veteran', 'yes, i', 'disabled veteran', 'active veteran'),
                              (t) => t === 'yes'],
      'Do not wish to answer': [(t) => hasAny(t, 'do not wish', 'prefer not', 'decline', 'choose not', 'not disclose', 'no answer')],
    },

    disability: {
      'No disability':       [(t) => hasAny(t, 'no, i', 'do not have', 'i don\'t', 'no disability', 'without disability', 'not disabled'),
                              (t) => t === 'no'],
      'Have a disability':   [(t) => hasAny(t, 'yes, i', 'i have', 'i do have', 'have a disability', 'with disability'),
                              (t) => t === 'yes'],
      'Do not wish to answer': [(t) => hasAny(t, 'do not wish', 'prefer not', 'decline', 'choose not', 'not disclose', 'no answer')],
    },

  };

  // Match a standardized stored value against the actual options in a <select>.
  // Returns the matching option's value, or null.
  function matchEEOSelect(el, eeoKey, storedValue) {
    if (!storedValue) return null;

    const synonymGroups = EEO_SYNONYMS[eeoKey];
    if (!synonymGroups) return null;

    const strategies = synonymGroups[storedValue];
    if (!strategies) return null;

    const options = Array.from(el.options).filter(o => o.value && o.value !== '');

    for (const strategy of strategies) {
      for (const opt of options) {
        const text = opt.text.toLowerCase().trim();
        if (strategy(text)) return opt.value;
      }
    }

    return null; // no match → caller highlights yellow
  }

  // ── Signal extraction ─────────────────────────────────────────────────────

  function tokenise(str) {
    return str.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  function getFieldSignals(el) {
    const candidates = [
      el.name,
      el.id,
      el.getAttribute('aria-label'),
      el.getAttribute('placeholder'),
      el.getAttribute('autocomplete'),
      el.getAttribute('data-field'),
      el.getAttribute('data-key'),
      (() => {
        if (el.id) {
          const label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
          return label ? label.textContent.trim() : null;
        }
        return null;
      })(),
      el.closest('label') ? el.closest('label').textContent.trim() : null,
      (() => {
        const wrap = el.closest('[class*="field"],[class*="Field"],[class*="form-group"],[class*="input-wrap"],[class*="form_group"]');
        const lbl = wrap && wrap.querySelector('label,[class*="label"],[class*="Label"]');
        return lbl ? lbl.textContent.trim() : null;
      })(),
    ];
    return candidates.filter(Boolean).map(tokenise);
  }

  // ── Token matching ────────────────────────────────────────────────────────

  function matchToken(elSig, fs) {
    if (elSig === fs) return true;
    function esc(s) { return s.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&'); }
    return new RegExp('(^|_)' + esc(fs) + '(_|$)').test(elSig);
  }

  // ── Keyword matching ──────────────────────────────────────────────────────

  function getVisibleLabel(el) {
    const parts = [];
    if (el.id) {
      const label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (label) parts.push(label.textContent.trim().toLowerCase());
    }
    const wrap = el.closest('[class*="field"],[class*="Field"],[class*="form-group"],[class*="input-wrap"],[class*="form_group"]');
    const lbl = wrap && wrap.querySelector('label,[class*="label"],[class*="Label"]');
    if (lbl) parts.push(lbl.textContent.trim().toLowerCase());
    const aria = el.getAttribute('aria-label');
    if (aria) parts.push(aria.toLowerCase());
    const ph = el.getAttribute('placeholder');
    if (ph) parts.push(ph.toLowerCase());
    return parts.join(' ');
  }

  function matchKeywords(el, keywords) {
    const text = getVisibleLabel(el);
    if (!text) return false;
    return [...keywords].sort((a, b) => b.length - a.length)
      .some(kw => text.includes(kw.toLowerCase()));
  }

  // ── Field matching ────────────────────────────────────────────────────────

  function matchField(el) {
    const signals = getFieldSignals(el);

    for (const { key, signals: fieldSignals } of FIELD_MAP) {
      for (const elSig of signals) {
        for (const fs of fieldSignals) {
          if (matchToken(elSig, fs)) return key;
        }
      }
    }

    for (const { key, keywords } of FIELD_MAP) {
      if (keywords && matchKeywords(el, keywords)) return key;
    }

    return null;
  }

  // ── Value resolution ──────────────────────────────────────────────────────

  function resolveValue(profile, key) {
    const noSponsorship = INFERRED_NO_SPONSORSHIP.has(profile.workAuth);
    switch (key) {
      case 'fullName':
        return ((profile.firstName || '') + ' ' + (profile.lastName || '')).trim();
      case 'requiresSponsorship':
      case 'requiresSponsorshipFuture':
      case 'sponsorshipAny':
        if (noSponsorship) return 'No';
        return profile.requiresSponsorship ? 'Yes' : '';
      case 'country':
        return profile.country || 'United States';
      default:
        return profile[key] || '';
    }
  }

  // ── Fill functions ────────────────────────────────────────────────────────

  function fillInput(el, value) {
    if (!value) return false;
    const nativeSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') || {}).set;
    if (nativeSetter) nativeSetter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }

  function fillTextarea(el, value) {
    if (!value) return false;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function fillSelect(el, value) {
    if (!value) return false;
    const lower = value.toLowerCase();
    for (const opt of el.options) {
      if (opt.value.toLowerCase() === lower || opt.text.toLowerCase() === lower) {
        el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); return true;
      }
    }
    for (const opt of el.options) {
      if (opt.text.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower)) {
        el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); return true;
      }
    }
    return false;
  }

  // ── Highlight ─────────────────────────────────────────────────────────────

  function highlight(el, type) {
    const colors = {
      filled:    { bg: '#f0fdf4', border: '#22c55e' },
      sensitive: { bg: '#fffbeb', border: '#f59e0b' },
    };
    const c = colors[type] || colors.filled;
    el.style.setProperty('background-color', c.bg, 'important');
    el.style.setProperty('border-color', c.border, 'important');
    el.style.setProperty('outline', '2px solid ' + c.border, 'important');
    el.style.setProperty('outline-offset', '1px', 'important');
    el.setAttribute('data-jdsaver', type);
  }

  function clearHighlight(el) {
    el.style.removeProperty('background-color');
    el.style.removeProperty('border-color');
    el.style.removeProperty('outline');
    el.style.removeProperty('outline-offset');
    el.removeAttribute('data-jdsaver');
  }

  // ── React Select detection & filling ─────────────────────────────────────
  // React Select ignores programmatic el.value changes — React owns the state.
  // The only reliable method is simulating real user clicks:
  //   1. Click the control div to open the menu
  //   2. Wait for options to render
  //   3. Click the matching option div
  //
  // We detect React Select by the presence of class fragments:
  //   select__control, select__menu, select__option  (react-select default)
  //   select-shell, select__container                (Greenhouse wrapper)

  function isReactSelectControl(el) {
    const cls = el.className || '';
    return cls.includes('select__control') || cls.includes('select-shell');
  }

  // Given a React Select control element, find its closest wrapper that also
  // contains the associated label so we can match the field.
  function getReactSelectWrapper(control) {
    // Walk up until we find a node that has both the control and a label
    let node = control.parentElement;
    while (node && node !== document.body) {
      if (node.querySelector('label') || node.id === 'demographic-section') return node;
      node = node.parentElement;
    }
    return control.closest('[class*="select"]') || control.parentElement;
  }

  // Find all React Select controls on the page that aren't already filled
  function findReactSelects() {
    return Array.from(document.querySelectorAll(
      '[class*="select__control"], [class*="select-shell"]'
    )).filter(el => {
      // Skip if already handled
      if (el.getAttribute('data-jdsaver')) return false;
      // Must be visible
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  // Click-simulate filling a single React Select.
  // Returns a Promise resolving to 'filled' | 'nomatch' | 'skip'
  function fillOneReactSelect(control, eeoKey, storedValue) {
    return new Promise(resolve => {
      if (!storedValue) { resolve('skip'); return; }

      // Open the menu
      control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      control.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true }));
      control.click();

      // Wait for React to render the options
      setTimeout(() => {
        // Options may render inside the control's ancestor or portalled to body
        const wrapper = control.closest('[class*="select"]') || control.parentElement;
        let optionEls = Array.from(
          wrapper.querySelectorAll('[class*="select__option"]')
        );
        if (!optionEls.length) {
          // Portalled to document body
          optionEls = Array.from(document.querySelectorAll('[class*="select__option"]'));
        }

        if (!optionEls.length) {
          // Menu didn't open — close cleanly and report no match
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          resolve('nomatch');
          return;
        }

        // Use our synonym strategies to find the right option element
        const synonymGroups = EEO_SYNONYMS[eeoKey];
        const strategies = synonymGroups ? synonymGroups[storedValue] : null;

        let target = null;
        if (strategies) {
          for (const strategy of strategies) {
            target = optionEls.find(o => strategy(o.textContent.toLowerCase().trim()));
            if (target) break;
          }
        }

        if (target) {
          target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          target.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true }));
          target.click();
          resolve('filled');
        } else {
          // Close menu, report no match
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          resolve('nomatch');
        }
      }, 150);
    });
  }

  // ── Main fill ─────────────────────────────────────────────────────────────
  // Returns a Promise so the message listener can await it.

  async function fillForms(profile) {
    const results = { filled: 0, sensitive: 0 };
    const filledKeys = new Set();

    // ── Pass 1: React Select dropdowns (EEO fields) ──────────────────────
    // Must be sequential — opening two menus at once causes conflicts.
    for (const control of findReactSelects()) {
      const wrapper = getReactSelectWrapper(control);

      // Identify the field from the wrapper's label text
      const labelEl = wrapper.querySelector('label');
      if (!labelEl) continue;
      const labelText = labelEl.textContent.toLowerCase();

      // Match label to an EEO key using keyword list
      let eeoKey = null;
      for (const { key, keywords } of FIELD_MAP) {
        if (!EEO_KEYS.has(key) || !keywords) continue;
        if (keywords.some(kw => labelText.includes(kw.toLowerCase()))) {
          eeoKey = key;
          break;
        }
      }
      if (!eeoKey) continue;

      const storedValue = profile[eeoKey] || '';
      if (!storedValue) continue;

      const outcome = await fillOneReactSelect(control, eeoKey, storedValue);

      if (outcome === 'filled') {
        highlight(control, 'filled');
        results.filled++;
      } else if (outcome === 'nomatch') {
        highlight(control, 'sensitive');
        results.sensitive++;
      }
      // 'skip' = blank setting, do nothing

      // Brief pause between React Selects so menus fully close
      await new Promise(r => setTimeout(r, 80));
    }

    // ── Pass 2: Native inputs, textareas, and real <select> elements ─────
    const inputs = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])' +
      ':not([type="checkbox"]):not([type="radio"]):not([type="file"])' +
      ':not([type="password"]):not([disabled]):not([readonly]),' +
      'textarea:not([disabled]):not([readonly]),' +
      'select:not([disabled])'
    );

    inputs.forEach(el => {
      // Skip any input that lives inside a React Select widget — handled in pass 1.
      // React Select renders a visible text input (class="select__input") for keyboard search;
      // we must never type into it directly.
      if (el.classList.contains('select__input')) return;
      if (el.closest('[class*="select__"], [class*="select-shell"]')) return;
      if (el.value && el.value.trim()) return;

      const key = matchField(el);
      if (!key) return;
      if (key === 'phone' && filledKeys.has('phone')) return;

      const tag = el.tagName.toLowerCase();

      // EEO on a real <select> (non-React)
      if (EEO_KEYS.has(key)) {
        const storedValue = profile[key] || '';
        if (!storedValue) return;
        if (tag === 'select') {
          const matchedOption = matchEEOSelect(el, key, storedValue);
          if (matchedOption !== null) {
            el.value = matchedOption;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            highlight(el, 'filled');
            results.filled++;
          } else {
            highlight(el, 'sensitive');
            results.sensitive++;
          }
        } else {
          if (fillInput(el, storedValue)) { highlight(el, 'filled'); results.filled++; }
        }
        return;
      }

      // Standard fields
      const value = resolveValue(profile, key);
      if (!value) return;

      let filled = false;
      if (tag === 'select')        filled = fillSelect(el, value);
      else if (tag === 'textarea') filled = fillTextarea(el, value);
      else                         filled = fillInput(el, value);

      if (filled) { highlight(el, 'filled'); results.filled++; filledKeys.add(key); }
    });

    return results;
  }

  // ── Clear ─────────────────────────────────────────────────────────────────

  function clearAll() {
    document.querySelectorAll('[data-jdsaver]').forEach(clearHighlight);
  }

  // ── Message listener ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'autofill') {
      fillForms(msg.profile).then(results => {
        sendResponse({ success: true, results });
      });
      return true; // keep channel open for async response
    }
    if (msg.action === 'clearFill') {
      clearAll();
      sendResponse({ success: true });
    }
    return true;
  });

})();
