import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const tensionCards = [
  { id: 's1', kind: 'signal', layer: 'tension', label: 'Дольше ждать транспорт', sort_order: 1 },
  { id: 's2', kind: 'signal', layer: 'tension', label: 'Больше пробок', sort_order: 2 },
  { id: 's3', kind: 'signal', layer: 'tension', label: 'Сложнее пересаживаться', sort_order: 3 },
  { id: 's4', kind: 'signal', layer: 'tension', label: 'Поездки стали дороже', sort_order: 4 },
  { id: 's5', kind: 'signal', layer: 'tension', label: 'Сложнее попасть к важным услугам', sort_order: 5 },
];
const catalogRows = [
  ...tensionCards,
  { id: 'g1', kind: 'group', layer: null, label: 'Работающие', sort_order: 10 },
  { id: 'c1', kind: 'consequence', layer: null, label: 'Больше времени в дороге', sort_order: 20 },
];
const emptySnapshot = { participantCount: 0, branchCount: 0, threadCount: 0, branches: [], convergence: [], clarity: 0 };

function mockSupabase({ catalogError = false, hasSession = true } = {}) {
  let session = hasSession ? { user: { id: 'u1' } } : null;
  const rpc = vi.fn(async (name: string) => {
    if (name === 'get_my_active_theme') return { data: [{ id: 'theme-1', circle_id: 'circle-1', title: 'Время города', subtitle: 'Тестовая тема' }], error: null };
    if (name === 'get_theme_catalog') return catalogError ? { data: null, error: { message: 'permission denied for table catalog_items' } } : { data: catalogRows, error: null };
    if (name === 'get_theme_snapshot') return { data: emptySnapshot, error: null };
    if (name === 'join_circle_by_code') return { data: [{ circle_id: 'circle-1', circle_name: 'Круг', circle_context: 'ctx', theme_id: 'theme-1', theme_title: 'Время города', theme_subtitle: 'Тестовая тема' }], error: null };
    return { data: 'contribution-1', error: null };
  });
  vi.doMock('@supabase/supabase-js', () => ({
    createClient: () => ({
      rpc,
      auth: { getSession: vi.fn(async () => ({ data: { session }, error: null })), signInAnonymously: vi.fn(async () => { session = { user: { id: 'u1' } }; return { data: { session }, error: null }; }) },
      from: vi.fn(),
    }),
  }));
  return rpc;
}

async function renderProduction(path: string, opts?: { catalogError?: boolean; hasSession?: boolean }) {
  vi.stubEnv('VITE_APP_MODE', 'production');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key');
  const rpc = mockSupabase(opts);
  const { App } = await import('./App');
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
  return rpc;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
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



  it('production visitor без session на / видит приглашение и не вызывает get_my_active_theme', async () => {
    const rpc = await renderProduction('/', { hasSession: false });
    expect(await screen.findByRole('heading', { name: 'Войдите в закрытый круг' })).toBeInTheDocument();
    expect(screen.getByText('УЗОР открывается по ссылке-приглашению от куратора круга.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'У меня есть приглашение' })).toHaveAttribute('href', '/join');
    expect(rpc).not.toHaveBeenCalledWith('get_my_active_theme');
  });

  it('production visitor без session на /contribute не видит форму вклада', async () => {
    await renderProduction('/contribute?layer=tension', { hasSession: false });
    expect(await screen.findByRole('heading', { name: 'Войдите в закрытый круг' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Что происходит' })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Другое/)).not.toBeInTheDocument();
  });

  it('после production RPC на главной есть заголовок темы и три слоя', async () => {
    await renderProduction('/');
    expect(await screen.findByRole('heading', { name: 'Время города' })).toBeInTheDocument();
    const layers = screen.getByRole('link', { name: 'Стало сложнее' }).closest('.layers') as HTMLElement;
    expect(within(layers).getByRole('link', { name: 'Стало сложнее' })).toBeInTheDocument();
    expect(within(layers).getByRole('link', { name: 'Стало лучше' })).toBeInTheDocument();
    expect(within(layers).getByRole('link', { name: 'Можно изменить' })).toBeInTheDocument();
  });

  it('на /contribute?layer=tension есть не менее 5 карточек напряжения', async () => {
    await renderProduction('/contribute?layer=tension');
    await screen.findByRole('heading', { name: 'Стало сложнее' });
    expect(screen.getAllByRole('button').filter((button) => tensionCards.some((card) => card.label === button.textContent))).toHaveLength(5);
  });

  it('ошибка каталога даёт UZOR-LOAD-CATALOG, а не форму с одним Другое', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await renderProduction('/contribute?layer=tension', { catalogError: true });
    expect(await screen.findByText(/UZOR-LOAD-CATALOG/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Другое/)).not.toBeInTheDocument();
  });

  it('успешный join сохраняет активный context и ведёт на главную', async () => {
    const rpc = await renderProduction('/join?code=INVITE_CODE_123456', { hasSession: false });
    expect(await screen.findByText('Круг подключён')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Время города' })).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('join_circle_by_code', { input_code: 'INVITE_CODE_123456' });
    expect(localStorage.getItem('activeCircleId')).toBe('circle-1');
    expect(localStorage.getItem('activeThemeId')).toBe('theme-1');
  });

  it('snapshot пустого круга валиден', async () => {
    await renderProduction('/');
    expect(await screen.findByText('В этом круге пока туман: первая нить ещё не вплетена.')).toBeInTheDocument();
  });
});
