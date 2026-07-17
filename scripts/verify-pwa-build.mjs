import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stdout } from 'node:process';
import { URL } from 'node:url';

const dist = resolve('dist');
const requiredFiles = ['manifest.webmanifest', 'sw.js'];
for (const file of requiredFiles) {
  if (!existsSync(resolve(dist, file))) throw new Error(`[PWA verify] Missing required build asset: dist/${file}`);
}

const manifest = JSON.parse(readFileSync(resolve(dist, 'manifest.webmanifest'), 'utf8'));
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
  if (!icon) throw new Error(`[PWA verify] Manifest is missing ${requirement.label}`);
  const pathname = new URL(icon.src, 'https://example.test/uzor/manifest.webmanifest').pathname;
  if (!pathname.startsWith('/uzor/')) throw new Error(`[PWA verify] ${requirement.label} escapes the /uzor/ base: ${icon.src}`);
  if (!existsSync(resolve(dist, pathname.slice('/uzor/'.length)))) {
    throw new Error(`[PWA verify] Missing generated ${requirement.label}: dist/${pathname.slice('/uzor/'.length)}`);
  }
}

const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const appleMatch = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i);
if (!appleMatch) throw new Error('[PWA verify] index.html is missing the Apple Touch Icon link');
const applePath = new URL(appleMatch[1], 'https://example.test/uzor/index.html').pathname;
if (!applePath.startsWith('/uzor/')) throw new Error(`[PWA verify] Apple Touch Icon escapes the /uzor/ base: ${appleMatch[1]}`);
if (!existsSync(resolve(dist, applePath.slice('/uzor/'.length)))) {
  throw new Error(`[PWA verify] Missing generated Apple Touch Icon: dist/${applePath.slice('/uzor/'.length)}`);
}

stdout.write('[PWA verify] Manifest, Service Worker, install icons, maskable icon, and Apple Touch Icon verified.\n');
