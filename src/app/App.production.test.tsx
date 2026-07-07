import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe('production fallback', () => {
  it('показывает экран настройки Supabase вместо пустого экрана', async () => {
    vi.stubEnv('VITE_APP_MODE', 'production');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');

    const { App } = await import('./App');
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'УЗОР' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Нужна настройка Supabase' })).toBeInTheDocument();
    expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeInTheDocument();
    expect(screen.getByText(/VITE_SUPABASE_PUBLISHABLE_KEY/)).toBeInTheDocument();
  });
});
