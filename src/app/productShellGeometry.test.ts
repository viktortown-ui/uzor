import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('fullscreen geometry contract',()=>{
 it('subtracts the mobile dock once and keeps the inner map at 100%',()=>{const shell=readFileSync('src/app/productShell.css','utf8');const map=readFileSync('src/features/deltaMap/deltaMap.css','utf8');expect(shell).toContain('height: calc(100dvh - var(--mobile-app-dock-space))');expect(map).toMatch(/\.delta-map-page\{width:100%;height:100%/);expect(map).not.toMatch(/\.delta-map-page[^}]*100dvh/)});
});
