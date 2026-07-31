/* global process, URL, document, console */
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(process.cwd(), 'dist');
const artifacts = resolve(process.cwd(), 'artifacts/forecast-question-pipeline-visuals');
const mime = new Map([['.html', 'text/html'], ['.js', 'text/javascript'], ['.css', 'text/css'], ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.webmanifest', 'application/manifest+json']]);
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname.replace(/^\/uzor\/?/, '') || 'index.html';
  const file = resolve(root, pathname);
  if (!file.startsWith(root + sep) && file !== root) return response.writeHead(404).end();
  try { const body = await readFile(file); response.writeHead(200, { 'content-type': mime.get(extname(file)) ?? 'application/octet-stream' }).end(body); }
  catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}/uzor/`;
const browser = await chromium.launch();
await mkdir(artifacts, { recursive: true });
const cases = [
  ['future-hub-desktop', '/forecast', { width: 1440, height: 900 }],
  ['future-hub-mobile', '/forecast', { width: 390, height: 844 }],
  ['proposal-preview-desktop', '/forecast/propose', { width: 1440, height: 900 }],
  ['proposal-preview-mobile', '/forecast/propose', { width: 390, height: 844 }],
];
try {
  for (const [name, route, viewport] of cases) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(`${origin}#${route}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1 }).waitFor();
    const contract = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      clipped: [...document.querySelectorAll('button,a,input,textarea')].some(node => node.scrollWidth > node.clientWidth + 2),
      voteTargets: [...document.querySelectorAll('.future-votes button')].every(node => node.getBoundingClientRect().height >= 44),
    }));
    if (contract.h1 !== 1 || contract.overflow || contract.clipped || !contract.voteTargets) throw new Error(`${route} visual contract failed: ${JSON.stringify(contract)}`);
    await page.screenshot({ path: resolve(artifacts, `${name}.png`), fullPage: true });
    await context.close();
  }
  console.log(`Forecast question pipeline visuals: ${cases.length} screenshots captured.`);
} finally { await browser.close(); server.close(); }
