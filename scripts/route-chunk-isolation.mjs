/* global URL, console, process, location, performance, getComputedStyle, document */
import { createServer } from 'node:http';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(process.cwd(), 'dist');
const artifactRoot = resolve(process.cwd(), 'artifacts/legacy-circle-visuals');
const assets = await readdir(resolve(root, 'assets'));
const named = (pattern) => assets.filter((name) => pattern.test(name));
const requireAssets = (label, pattern, count) => {
  const matches = named(pattern);
  if (matches.length !== count) throw new Error(`Expected ${count} ${label} assets, found ${matches.length}: ${matches.join(', ') || 'none'}`);
  return matches;
};
const legacy = requireAssets('legacy route', /^LegacyCircleRoutes-.*\.(?:js|css)$/, 2);
const motion = requireAssets('Framer Motion route', /^use-reduced-motion-.*\.js$/, 1);
const maplibre = requireAssets('MapLibre', /^maplibre-gl-.*\.(?:js|css)$/, 2);
const admin = requireAssets('forecast-question admin route', /^ForecastQuestionAdminPage-.*\.js$/, 1);
const forbiddenOnModern = [...legacy, ...motion, ...maplibre, ...admin];
const types = new Map([['.html','text/html'],['.js','text/javascript'],['.css','text/css'],['.svg','image/svg+xml'],['.png','image/png'],['.webmanifest','application/manifest+json']]);
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const relative = url.pathname.replace(/^\/uzor\/?/, '') || 'index.html';
  const file = resolve(root, relative);
  if (!(file === root || file.startsWith(root + sep))) { res.writeHead(404).end(); return; }
  try { const body = await readFile(file); res.writeHead(200, {'content-type': types.get(extname(file)) ?? 'application/octet-stream'}).end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}/uzor/`;
const browser = await chromium.launch();
await mkdir(artifactRoot, { recursive: true });

const openClean = async (route, locator) => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const urls = [];
  page.on('request', (request) => urls.push(decodeURIComponent(request.url())));
  await page.goto(`${origin}#${route}`, { waitUntil: 'domcontentloaded' });
  try { await locator(page).waitFor({ timeout: 15_000 }); }
  catch (error) { throw new Error(`Route ${route} did not render. URL: ${page.url()}; body: ${(await page.locator('body').innerText()).slice(0, 500)}`, { cause: error }); }
  await page.waitForLoadState('networkidle');
  return { context, page, urls };
};
const requested = (urls, asset) => urls.some((url) => url.includes(asset));
const assertNone = (route, urls, assetNames) => {
  const found = assetNames.filter((asset) => requested(urls, asset));
  if (found.length) throw new Error(`${route} requested isolated assets: ${found.join(', ')}`);
};
const assertAll = (route, urls, assetNames) => {
  const missing = assetNames.filter((asset) => !requested(urls, asset));
  if (missing.length) throw new Error(`${route} did not request expected assets: ${missing.join(', ')}`);
};
const h1 = (name) => (page) => page.getByRole('heading', { level: 1, name });
const expectedEyebrow = async (page, selector, route) => {
  const locator = page.locator(selector).first();
  await locator.waitFor();
  const style = await locator.evaluate((node) => {
    const computed = getComputedStyle(node);
    return { color: computed.color, textTransform: computed.textTransform, fontWeight: computed.fontWeight, letterSpacing: computed.letterSpacing, fontSize: computed.fontSize };
  });
  const valid = style.color === 'rgb(125, 220, 255)'
    && style.textTransform === 'uppercase'
    && style.fontWeight === '800'
    && Number.parseFloat(style.letterSpacing) > 1
    && Number.parseFloat(style.fontSize) >= 12
    && Number.parseFloat(style.fontSize) <= 13;
  if (!valid) throw new Error(`${route} eyebrow baseline mismatch for ${selector}: ${JSON.stringify(style)}`);
  return style;
};

const visualCases = [
  ['desktop-demo-fog', '/demo?scenario=fog', { width: 1440, height: 900 }, h1('Куда уходит твой час?'), true],
  ['desktop-demo-contour', '/demo?scenario=contour', { width: 1440, height: 900 }, h1('Куда уходит твой час?'), true],
  ['desktop-old-contribute', '/lab/old-contribute?layer=tension', { width: 1440, height: 900 }, h1('Что ты сейчас узнаёшь?'), false],
  ['desktop-demo-branch', '/branch/support%7Cs2%7Cc8', { width: 1440, height: 900 }, (page) => page.locator('.branch-detail h1'), false],
  ['desktop-curator-overview', '/curator/overview', { width: 1440, height: 900 }, h1(/Сводка круга/), false],
  ['mobile-demo-fog', '/demo?scenario=fog', { width: 390, height: 844 }, h1('Куда уходит твой час?'), true],
  ['mobile-old-contribute', '/lab/old-contribute?layer=tension', { width: 390, height: 844 }, h1('Что ты сейчас узнаёшь?'), false],
];

try {
  for (const [route, locator, eyebrows] of [
    ['/auth?visual=email', h1('Войти по электронной почте'), ['.auth-page .eyebrow']],
    ['/about', h1('Карта городских изменений'), ['.about-page .eyebrow']],
    ['/settings', h1('Настройки'), ['.settings-page > .eyebrow', '.settings-page .product-guide .eyebrow']],
  ]) {
    const { context, page, urls } = await openClean(route, locator);
    assertNone(route, urls, forbiddenOnModern);
    for (const selector of eyebrows) await expectedEyebrow(page, selector, route);
    await context.close();
  }

  const forecast = await openClean('/forecast', h1('Вопросы о будущем'));
  assertNone('/forecast', forecast.urls, admin);
  await forecast.context.close();

  const adminRoute = await openClean('/forecast/admin/questions', (page) => page.getByText(/Нет доступа к редакторской очереди|Редакторская очередь/).first());
  assertAll('/forecast/admin/questions', adminRoute.urls, admin);
  await adminRoute.context.close();

  const demo = await openClean('/demo?scenario=fog', h1('Куда уходит твой час?'));
  assertAll('/demo', demo.urls, [...legacy, ...motion]);
  assertNone('/demo', demo.urls, maplibre);
  await demo.context.close();

  const map = await openClean('/map', (page) => page.locator('.delta-map-page'));
  assertAll('/map', map.urls, maplibre);
  assertNone('/map', map.urls, legacy);
  await expectedEyebrow(map.page, '.delta-map-header .eyebrow', '/map');
  await map.context.close();

  const wrapped = await openClean('/wrapped', h1('Личный итог недели'));
  assertNone('/wrapped', wrapped.urls, legacy);
  await wrapped.context.close();

  const styleContext = await browser.newContext({ serviceWorkers: 'block' });
  const stylePage = await styleContext.newPage();
  const authStyles = async () => stylePage.evaluate(() => {
    const take = (selector) => {
      const style = getComputedStyle(document.querySelector(selector));
      return { fontFamily: style.fontFamily, fontSize: style.fontSize, color: style.color, textTransform: style.textTransform, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing, borderRadius: style.borderRadius, backgroundColor: style.backgroundColor };
    };
    return { eyebrow: take('.auth-page .eyebrow'), heading: take('.auth-page h1'), button: take('.auth-card button') };
  });
  await stylePage.goto(`${origin}#/auth?visual=email`, { waitUntil: 'domcontentloaded' });
  await h1('Войти по электронной почте')(stylePage).waitFor();
  const cleanAuthStyles = await authStyles();
  await stylePage.evaluate(() => { location.hash = '#/demo?scenario=fog'; });
  await h1('Куда уходит твой час?')(stylePage).waitFor();
  await stylePage.evaluate(() => { location.hash = '#/auth?visual=email'; });
  await h1('Войти по электронной почте')(stylePage).waitFor();
  const postLegacyAuthStyles = await authStyles();
  if (JSON.stringify(cleanAuthStyles) !== JSON.stringify(postLegacyAuthStyles)) throw new Error(`Legacy CSS changed modern computed styles: ${JSON.stringify({ cleanAuthStyles, postLegacyAuthStyles })}`);
  await styleContext.close();

  for (const [name, route, viewport, locator, expectsScene] of visualCases) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto(`${origin}#${route}`, { waitUntil: 'domcontentloaded' });
    await locator(page).waitFor();
    await page.waitForLoadState('networkidle');
    const visual = await page.evaluate((sceneExpected) => {
      const heading = document.querySelector('.legacy-shell h1');
      const action = document.querySelector('.legacy-shell button,.legacy-shell .primary');
      const headingStyle = heading && getComputedStyle(heading);
      const actionStyle = action && getComputedStyle(action);
      const scene = document.querySelector('.legacy-shell .scene-wrap svg');
      return {
        legacyCssLoaded: performance.getEntriesByType('resource').some((entry) => /LegacyCircleRoutes-.*\.css/.test(entry.name)),
        shell: Boolean(document.querySelector('.legacy-shell')),
        suspense: Boolean(document.querySelector('[role="status"].route-loading')),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        headingStyled: Boolean(headingStyle && headingStyle.color !== 'rgb(0, 0, 0)' && Number.parseFloat(headingStyle.fontSize) >= 24),
        actionStyled: Boolean(actionStyle && Number.parseFloat(actionStyle.borderRadius) >= 20),
        eyebrowStyled: (() => { const eyebrow = document.querySelector('.legacy-shell .eyebrow'); const style = eyebrow && getComputedStyle(eyebrow); return Boolean(style && style.color === 'rgb(125, 220, 255)' && style.textTransform === 'uppercase' && style.fontWeight === '800' && Number.parseFloat(style.letterSpacing) > 1 && Number.parseFloat(style.fontSize) >= 12 && Number.parseFloat(style.fontSize) <= 13); })(),
        sceneVisible: !sceneExpected || Boolean(scene && scene.getBoundingClientRect().width > 200 && scene.getBoundingClientRect().height > 100),
      };
    }, expectsScene);
    if (!visual.legacyCssLoaded || !visual.shell || visual.suspense || visual.overflow || !visual.headingStyled || !visual.actionStyled || !visual.eyebrowStyled || !visual.sceneVisible) throw new Error(`${route} legacy visual contract failed: ${JSON.stringify(visual)}`);
    await page.screenshot({ path: resolve(artifactRoot, `${name}.png`), fullPage: true });
    await context.close();
  }
  console.log(`Production route isolation and ${visualCases.length} legacy visual artifacts verified.`);
} finally {
  await browser.close();
  server.close();
}
