// background.js — Service worker
//
// Owns the telemetry outbox: the popup hands feedback payloads here so a popup
// closing mid-request can't lose them. Unsent payloads are retried on startup,
// on install/update, and whenever the popup opens.

importScripts('telemetry.js');

let flushing = false;

async function tlFlushOutbox() {
  if (flushing) return;
  flushing = true;
  try {
    let outbox = (await tlStorageGet(OUTBOX_KEY)) || [];
    if (!outbox.length || !TELEMETRY_URL) return;

    const remaining = [];
    for (const item of outbox) {
      let sent = false;
      try {
        // host_permissions (<all_urls>) lets the worker read the Apps Script
        // reply, so we only drop an item once the script confirms "ok".
        const res = await fetch(TELEMETRY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(item.payload),
        });
        sent = res.ok && (await res.text()).trim() === 'ok';
      } catch (e) {
        sent = false;
      }
      if (!sent) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts < MAX_SEND_ATTEMPTS) remaining.push(item);
      }
    }
    await tlStorageSet(OUTBOX_KEY, remaining);
  } finally {
    flushing = false;
  }
}

async function tlEnqueue(payloads) {
  let outbox = (await tlStorageGet(OUTBOX_KEY)) || [];
  payloads.forEach(p => { outbox = tlAddToOutbox(outbox, p); });
  await tlStorageSet(OUTBOX_KEY, outbox);
  await tlFlushOutbox();
}

chrome.runtime.onInstalled.addListener(async () => {
  // Creates the anonymous install ID on first install; keeps it on updates.
  await tlLoad();
  tlFlushOutbox();
});

chrome.runtime.onStartup.addListener(() => { tlFlushOutbox(); });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'telemetry:queue' && Array.isArray(msg.payloads)) {
    tlEnqueue(msg.payloads).finally(() => sendResponse({ ok: true }));
    return true; // keep the worker alive until the send finishes
  }
  if (msg?.type === 'telemetry:flush') {
    tlFlushOutbox().finally(() => sendResponse({ ok: true }));
    return true;
  }
});
