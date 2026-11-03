import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const websiteDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(websiteDir, 'screenshots');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const debuggingPort = 9333;

await mkdir(outputDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--hide-scrollbars',
  '--disable-gpu',
  `--remote-debugging-port=${debuggingPort}`,
  '--user-data-dir=/tmp/jobsearch-aide-screenshot-profile',
  'about:blank',
], { stdio: 'ignore' });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getDebugTarget() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === 'page');
      if (page) return page;
    } catch {
      // Chrome may need a moment to open its debugging socket.
    }
    await delay(100);
  }
  throw new Error('Chrome did not expose a debuggable page.');
}

const target = await getDebugTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let messageId = 0;

socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  const id = ++messageId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function capture({ page, filename, width, height, selector }) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await send('Page.navigate', { url: new URL(page, `file://${websiteDir}/`).href });
  await delay(500);

  const expression = selector
    ? `(() => {
        const target = document.querySelector(${JSON.stringify(selector)});
        if (!target) throw new Error('Missing screenshot target: ${selector}');
        const top = target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top, behavior: 'instant' });
        return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      })()`
    : `new Promise((resolve) => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      })`;

  await send('Runtime.evaluate', { expression, awaitPromise: true });
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(path.join(outputDir, filename), Buffer.from(data, 'base64'));
}

try {
  await send('Page.enable');
  await send('Runtime.enable');

  await capture({ page: 'index.html', filename: 'landing-desktop.png', width: 1440, height: 900 });
  await capture({ page: 'index.html', filename: 'flow-desktop.png', width: 1440, height: 760, selector: '.problem' });
  await capture({ page: 'index.html', filename: 'networking-desktop.png', width: 1440, height: 900, selector: '.networking' });
  await capture({ page: 'setup.html', filename: 'setup-desktop.png', width: 1440, height: 900, selector: '.downloads' });
  await capture({ page: 'index.html', filename: 'landing-mobile.png', width: 430, height: 932 });
} finally {
  socket.close();
  chrome.kill('SIGTERM');
}
