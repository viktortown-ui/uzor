import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { URL } from 'node:url';

const dummyOrigin = 'https://pwa-build.invalid';

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1];
}

function tags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];
}

export function deriveBuildContext(html) {
  const manifestTag = tags(html, 'link').find((tag) => attribute(tag, 'rel')?.split(/\s+/).includes('manifest'));
  const manifestHref = manifestTag && attribute(manifestTag, 'href');
  if (!manifestHref) throw new Error('[PWA verify] index.html is missing the web manifest link');
  const manifestUrl = new URL(manifestHref, `${dummyOrigin}/index.html`);
  if (manifestUrl.origin !== dummyOrigin) throw new Error(`[PWA verify] Manifest points outside the build origin: ${manifestHref}`);
  return { manifestHref, manifestUrl, baseUrl: new URL('.', manifestUrl) };
}

export function resolveInsideBase(reference, baseUrl, label) {
  const url = new URL(reference, baseUrl);
  const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
  if (url.origin !== baseUrl.origin || !url.pathname.startsWith(basePath)) {
    throw new Error(`[PWA verify] ${label} points outside the application base ${basePath}: ${reference}`);
  }
  const relativePath = decodeURIComponent(url.pathname.slice(basePath.length));
  if (!relativePath || relativePath.split('/').includes('..')) {
    throw new Error(`[PWA verify] ${label} has an invalid generated path: ${reference}`);
  }
  return { url, relativePath };
}

function requireFile(dist, relativePath, label) {
  const file = resolve(dist, relativePath);
  const distPrefix = `${resolve(dist)}${sep}`;
  if (!file.startsWith(distPrefix) || !existsSync(file)) {
    throw new Error(`[PWA verify] Missing generated ${label}: dist/${relativePath}`);
  }
}

export function verifyPwaBuild(distDirectory = 'dist') {
  const dist = resolve(distDirectory);
  const indexPath = resolve(dist, 'index.html');
  if (!existsSync(indexPath)) throw new Error('[PWA verify] Missing required build asset: dist/index.html');
  const html = readFileSync(indexPath, 'utf8');
  const { manifestHref, manifestUrl, baseUrl } = deriveBuildContext(html);
  const manifestReference = resolveInsideBase(manifestHref, baseUrl, 'Web manifest');
  requireFile(dist, manifestReference.relativePath, 'Web manifest');
  requireFile(dist, 'sw.js', 'Service Worker');

  const manifest = JSON.parse(readFileSync(resolve(dist, manifestReference.relativePath), 'utf8'));
  const expectedManifest = {
    id: './', start_url: './#/pulse', scope: './', display: 'standalone', lang: 'ru',
    theme_color: '#050b16', background_color: '#050b16',
  };
  for (const [key, expected] of Object.entries(expectedManifest)) {
    if (manifest[key] !== expected) throw new Error(`[PWA verify] Manifest ${key} must be ${JSON.stringify(expected)}, received ${JSON.stringify(manifest[key])}`);
  }

  const scopeUrl = new URL(manifest.scope, manifestUrl);
  const startUrl = new URL(manifest.start_url, manifestUrl);
  if (startUrl.origin !== scopeUrl.origin || !startUrl.pathname.startsWith(scopeUrl.pathname)) {
    throw new Error(`[PWA verify] Resolved start URL ${startUrl.href} is outside scope ${scopeUrl.href}`);
  }

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const iconRequirements = [
    { label: '64x64 icon', sizes: '64x64', purpose: 'any' },
    { label: '192x192 icon', sizes: '192x192', purpose: 'any' },
    { label: '512x512 icon', sizes: '512x512', purpose: 'any' },
    { label: 'maskable 512x512 icon', sizes: '512x512', purpose: 'maskable' },
  ];
  for (const requirement of iconRequirements) {
    const icon = icons.find((candidate) => candidate.sizes === requirement.sizes
      && (candidate.purpose ?? 'any').split(/\s+/).includes(requirement.purpose));
    if (!icon?.src) throw new Error(`[PWA verify] Manifest is missing ${requirement.label}`);
    const resolved = resolveInsideBase(icon.src, baseUrl, requirement.label);
    requireFile(dist, resolved.relativePath, requirement.label);
  }

  const linkTags = tags(html, 'link');
  const appleTag = linkTags.find((tag) => attribute(tag, 'rel') === 'apple-touch-icon');
  const appleHref = appleTag && attribute(appleTag, 'href');
  if (!appleHref) throw new Error('[PWA verify] index.html is missing the Apple Touch Icon link');
  const apple = resolveInsideBase(appleHref, baseUrl, 'Apple Touch Icon');
  requireFile(dist, apple.relativePath, 'Apple Touch Icon');

  const generatedAssets = [
    ...tags(html, 'script').map((tag) => ({ reference: attribute(tag, 'src'), label: 'JavaScript asset' })),
    ...linkTags.filter((tag) => attribute(tag, 'rel')?.split(/\s+/).includes('stylesheet'))
      .map((tag) => ({ reference: attribute(tag, 'href'), label: 'CSS asset' })),
    ...linkTags.filter((tag) => attribute(tag, 'rel')?.split(/\s+/).includes('icon')
      && attribute(tag, 'rel') !== 'apple-touch-icon')
      .map((tag) => ({ reference: attribute(tag, 'href'), label: 'favicon asset' })),
  ];
  if (!generatedAssets.some(({ label }) => label === 'JavaScript asset')) throw new Error('[PWA verify] index.html has no built JavaScript asset');
  if (!generatedAssets.some(({ label }) => label === 'CSS asset')) throw new Error('[PWA verify] index.html has no built CSS asset');
  for (const { reference, label } of generatedAssets) {
    if (!reference) throw new Error(`[PWA verify] ${label} is missing its URL`);
    const asset = resolveInsideBase(reference, baseUrl, label);
    requireFile(dist, asset.relativePath, label);
  }

  return { basePath: baseUrl.pathname, startUrl: startUrl.href, scopeUrl: scopeUrl.href };
}
