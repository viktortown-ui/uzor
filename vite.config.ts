import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/');

export default defineConfig({ base, plugins: [react()], test: { environment: 'jsdom', setupFiles: './vitest.setup.ts', css: true } });
