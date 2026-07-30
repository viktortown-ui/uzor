/* global URL, console, process */
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(process.cwd(), 'dist');
const assets = await readdir(resolve(root, 'assets'));
const named = (pattern) => assets.filter((name) => pattern.test(name));
const legacy = named(/^LegacyCircleRoutes-.*\.(?:js|css)$/);
const maplibre = named(/^maplibre-gl-.*\.(?:js|css)$/);
if (!legacy.some((name) => name.endsWith('.js')) || !legacy.some((name) => name.endsWith('.css'))) throw new Error('Legacy JS/CSS assets were not emitted');
if (!maplibre.length) throw new Error('MapLibre assets were not emitted');
const types = new Map([['.html','text/html'],['.js','text/javascript'],['.css','text/css'],['.svg','image/svg+xml'],['.png','image/png'],['.webmanifest','application/manifest+json']]);
const server = createServer(async (req,res) => { const url = new URL(req.url ?? '/', 'http://localhost'); const relative = url.pathname.replace(/^\/uzor\/?/, '') || 'index.html'; const file = resolve(root, relative); if (!(file === root || file.startsWith(root + sep))) { res.writeHead(404).end(); return; } try { const body = await readFile(file); res.writeHead(200, {'content-type': types.get(extname(file)) ?? 'application/octet-stream'}).end(body); } catch { res.writeHead(404).end(); } });
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}/uzor/`;
const browser = await chromium.launch();
const requested = async (route, expectedText) => { const context = await browser.newContext({ serviceWorkers: 'block' }); const page = await context.newPage(); const urls = []; page.on('request', (request) => urls.push(request.url())); await page.goto(`${origin}#${route}`, { waitUntil: 'networkidle' }); if (expectedText) await page.getByText(expectedText, { exact: false }).first().waitFor(); await context.close(); return urls.map((url) => decodeURIComponent(url)); };
try {
  for (const route of ['/auth','/about','/settings']) { const urls = await requested(route); if ([...legacy,...maplibre].some((asset) => urls.some((url) => url.includes(asset)))) throw new Error(`${route} requested an isolated asset: ${urls.filter((url) => [...legacy,...maplibre].some((asset) => url.includes(asset))).join(', ')}`); }
  const demoUrls = await requested('/demo?scenario=fog', 'Куда уходит твой час?');
  for (const asset of legacy.filter((name) => /^LegacyCircleRoutes-/.test(name))) if (!demoUrls.some((url) => url.includes(asset))) throw new Error(`/demo did not request ${asset}`);
  if (maplibre.some((asset) => demoUrls.some((url) => url.includes(asset)))) throw new Error('/demo requested MapLibre');
  const mapUrls = await requested('/map');
  if (!maplibre.some((asset) => mapUrls.some((url) => url.includes(asset)))) throw new Error('/map did not request MapLibre');
  if (legacy.some((asset) => mapUrls.some((url) => url.includes(asset)))) throw new Error('/map requested legacy assets');
  console.log('Production network isolation verified for auth, about, settings, demo, and map routes.');
} finally { await browser.close(); server.close(); }
