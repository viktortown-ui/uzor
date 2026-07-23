/* global URL, console, process, navigator */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(process.cwd(), 'dist');
if (!existsSync(root)) throw new Error('dist directory is missing; run VITE_BASE_PATH=/uzor/ npm run build first');
const types = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json'],['.webmanifest','application/manifest+json'],['.svg','image/svg+xml'],['.png','image/png']]);
const assetExtensions = new Set(['.js', '.css', '.json', '.webmanifest', '.svg', '.png', '.ico']);
function insideDist(file) { const normalized = resolve(file); return normalized === root || normalized.startsWith(root + sep); }
function notFound(res) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Not found'); }
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (!url.pathname.startsWith('/uzor')) return notFound(res);
  const relative = url.pathname === '/uzor' || url.pathname === '/uzor/' ? 'index.html' : decodeURIComponent(url.pathname.slice('/uzor/'.length));
  const requested = resolve(root, relative);
  if (!insideDist(requested)) return notFound(res);
  try { const data = await readFile(requested); res.writeHead(200, { 'content-type': types.get(extname(requested)) ?? 'application/octet-stream' }); res.end(data); return; }
  catch {
    if (assetExtensions.has(extname(relative)) || relative.includes('.')) return notFound(res);
    const data = await readFile(join(root, 'index.html')); res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(data);
  }
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const expectedScope = `${base}/uzor/`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error' && /manifest|icon|service worker|sw/i.test(msg.text())) consoleErrors.push(msg.text()); });
  await page.goto(`${base}/uzor/#/pulse`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => navigator.serviceWorker?.getRegistration?.('/uzor/').then(Boolean));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  const sw = await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration('/uzor/'); return { scope: registration?.scope, controlled: Boolean(navigator.serviceWorker.controller) }; });
  if (sw.scope !== expectedScope) throw new Error(`Unexpected Service Worker scope: ${sw.scope}`);
  if (!sw.controlled) throw new Error('Service Worker does not control the page after reload');
  const client = await page.context().newCDPSession(page);
  const manifest = await client.send('Page.getAppManifest');
  if (!manifest.url.startsWith(expectedScope)) throw new Error(`Manifest URL outside /uzor/: ${manifest.url}`);
  const critical = (manifest.errors ?? []).filter((error) => error.critical !== 0 && error.critical !== false);
  if (critical.length) throw new Error(`Critical manifest errors: ${JSON.stringify(critical)}`);
  const installability = await client.send('Page.getInstallabilityErrors');
  const actualErrors = installability.installabilityErrors ?? [];
  if (actualErrors.length) throw new Error(`Installability errors: ${JSON.stringify(actualErrors)}`);
  const parsed = JSON.parse(manifest.data || '{}');
  const icons = parsed.icons ?? [];
  async function requireIcon(label, predicate) {
    const icon = icons.find(predicate);
    if (!icon) throw new Error(`Missing required icon: ${label}`);
    const url = new URL(icon.src, manifest.url).href;
    if (!url.startsWith(expectedScope)) throw new Error(`Icon outside /uzor/: ${url}`);
    const response = await page.request.get(url);
    const body = await response.body();
    const contentType = response.headers()['content-type'] ?? '';
    if (response.status() !== 200 || !contentType.includes('image/png') || body.length === 0) throw new Error(`Invalid ${label} icon ${url}: status=${response.status()} content-type=${contentType} bytes=${body.length}`);
    return url;
  }
  const verifiedIcons = [
    await requireIcon('192x192 any', (icon) => /(^|\s)192x192(\s|$)/.test(icon.sizes ?? '') && !/(^|\s)maskable(\s|$)/.test(icon.purpose ?? 'any')),
    await requireIcon('512x512 any', (icon) => /(^|\s)512x512(\s|$)/.test(icon.sizes ?? '') && !/(^|\s)maskable(\s|$)/.test(icon.purpose ?? 'any')),
    await requireIcon('512x512 maskable', (icon) => /(^|\s)512x512(\s|$)/.test(icon.sizes ?? '') && /(^|\s)maskable(\s|$)/.test(icon.purpose ?? '')),
  ];
  if (consoleErrors.length) throw new Error(`Console PWA errors: ${consoleErrors.join('\n')}`);
  console.log(JSON.stringify({ manifestUrl: manifest.url, installabilityErrors: actualErrors, serviceWorker: sw, icons: verifiedIcons }, null, 2));
} finally { await browser.close(); server.close(); }
