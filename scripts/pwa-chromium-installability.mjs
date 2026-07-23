/* global URL, console, process, navigator */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const root = join(process.cwd(), 'dist');
if (!existsSync(root)) throw new Error('dist directory is missing; run VITE_BASE_PATH=/uzor/ npm run build first');
const types = new Map([['.html','text/html'],['.js','text/javascript'],['.css','text/css'],['.json','application/json'],['.webmanifest','application/manifest+json'],['.svg','image/svg+xml'],['.png','image/png']]);
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const pathname = url.pathname.startsWith('/uzor/') ? url.pathname.slice('/uzor/'.length) : url.pathname === '/uzor' ? 'index.html' : url.pathname.slice(1);
  const file = join(root, pathname || 'index.html');
  try { const data = await readFile(file); res.writeHead(200, { 'content-type': types.get(extname(file)) ?? 'application/octet-stream' }); res.end(data); }
  catch { const data = await readFile(join(root, 'index.html')); res.writeHead(200, { 'content-type': 'text/html' }); res.end(data); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error' && /manifest|icon|service worker|sw/i.test(msg.text())) consoleErrors.push(msg.text()); });
  await page.goto(`${base}/uzor/#/pulse`, { waitUntil: 'networkidle' });
  const client = await page.context().newCDPSession(page);
  const manifest = await client.send('Page.getAppManifest');
  if (!manifest.url.includes('/uzor/')) throw new Error(`Manifest URL outside /uzor/: ${manifest.url}`);
  const critical = (manifest.errors ?? []).filter((error) => error.critical !== 0 && error.critical !== false);
  if (critical.length) throw new Error(`Critical manifest errors: ${JSON.stringify(critical)}`);
  const installability = await client.send('Page.getInstallabilityErrors');
  const blocking = (installability.installabilityErrors ?? []).filter((error) => !/not in main frame/i.test(error.errorId ?? ''));
  if (blocking.length) throw new Error(`Installability errors: ${JSON.stringify(blocking)}`);
  const parsed = JSON.parse(manifest.data || '{}');
  const iconUrls = (parsed.icons ?? []).filter((icon) => /(^|\s)(192x192|512x512)(\s|$)/.test(icon.sizes ?? '')).map((icon) => new URL(icon.src, manifest.url).href);
  if (iconUrls.length < 2) throw new Error('Missing 192x192 or 512x512 manifest icons');
  for (const iconUrl of iconUrls) { const response = await page.request.get(iconUrl); if (response.status() !== 200) throw new Error(`Icon unavailable ${iconUrl}: ${response.status()}`); }
  await page.waitForFunction(() => navigator.serviceWorker?.getRegistration?.('/uzor/').then(Boolean));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  const sw = await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration('/uzor/'); return { scope: registration?.scope, controlled: Boolean(navigator.serviceWorker.controller) }; });
  if (!sw.scope?.endsWith('/uzor/')) throw new Error(`Unexpected Service Worker scope: ${sw.scope}`);
  if (!sw.controlled) throw new Error('Service Worker does not control the page after reload');
  if (consoleErrors.length) throw new Error(`Console PWA errors: ${consoleErrors.join('\n')}`);
  console.log(JSON.stringify({ manifestUrl: manifest.url, installabilityErrors: [], serviceWorker: sw, icons: iconUrls }, null, 2));
} finally { await browser.close(); server.close(); }
