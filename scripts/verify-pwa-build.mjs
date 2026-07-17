import { stdout } from 'node:process';
import { verifyPwaBuild } from './pwa-build-verification.mjs';

const result = verifyPwaBuild();
stdout.write(`[PWA verify] Manifest, Service Worker, generated icons, Apple Touch Icon, scripts, and styles verified for base ${result.basePath}.\n`);
