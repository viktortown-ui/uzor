import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(()=>{ cleanup(); vi.resetModules(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
async function loadPage() {
 vi.doMock('./DeltaMapCanvas',()=>({ DeltaMapCanvas: ({ onViewport, onSelect, deltas }: { onViewport: (b: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => void; onSelect: (d: { id: string; statement: string }) => void; deltas: Array<{ id: string; statement: string }> }) => <div data-testid="mock-map"><button onClick={()=>onViewport({minLat:1,minLng:1,maxLat:2,maxLng:2})}>empty viewport</button><button onClick={()=>onViewport({minLat:57,minLng:55,maxLat:59,maxLng:57})}>viewport</button>{deltas.map((d)=><button key={d.id} onClick={()=>onSelect(d)}>{d.statement}</button>)}</div> }));
 const mod = await import('./DeltaMapPage');
 return mod.DeltaMapPage;
}
describe('DeltaMapPage component states',()=>{
 it('/map рендерит shell и filters без token', async()=>{ const Page=await loadPage(); render(<MemoryRouter><Page/></MemoryRouter>); expect(await screen.findByText('Направление')).toBeInTheDocument(); expect(screen.getByTestId('mock-map')).toBeInTheDocument(); });
 it('/map показывает empty state и filters отображаются', async()=>{ const Page=await loadPage(); render(<MemoryRouter><Page/></MemoryRouter>); expect(await screen.findByText('Направление')).toBeInTheDocument(); await userEvent.click(screen.getByText('empty viewport')); expect(await screen.findByText('В этой части карты пока нет дельт')).toBeInTheDocument(); });
 it('выбор marker открывает sibling inspector, confirm/disconfirm показывают effect', async()=>{ const Page=await loadPage(); const view=render(<MemoryRouter><Page/></MemoryRouter>); await userEvent.click(await screen.findByText('viewport')); await userEvent.click(await screen.findByText('Стало дольше ждать транспорт вечером.')); const inspector=await screen.findByLabelText('Карточка дельты'); expect(inspector).toBeInTheDocument(); expect(inspector.parentElement).toBe(view.container.querySelector('.delta-map-main')); expect(view.container.querySelector('.delta-map-stage')?.nextElementSibling).toBe(inspector); await userEvent.click(screen.getByRole('button',{name:'Подтверждаю'})); expect(await screen.findByText(/Ваш отклик усилил дельту/)).toBeInTheDocument(); await waitFor(()=>expect(screen.getByRole('button',{name:'Не подтверждаю'})).toBeEnabled()); await userEvent.click(screen.getByRole('button',{name:'Не подтверждаю'})); expect(await screen.findByText(/Вы создали развилку/)).toBeInTheDocument(); });
 it('deep-link card closes once, preserves other params, and does not reopen', async()=>{
  const Page=await loadPage();
  function LocationProbe(){const location=useLocation();return <output data-testid="location">{location.pathname}{location.search}</output>}
  const view=render(<MemoryRouter initialEntries={['/map?delta=demo-1&keep=yes']}><Page/><LocationProbe/></MemoryRouter>);
  await screen.findByLabelText('Карточка дельты');
  await userEvent.click(screen.getByRole('button',{name:'Закрыть'}));
  await waitFor(()=>expect(screen.queryByLabelText('Карточка дельты')).not.toBeInTheDocument());
  expect(screen.getByTestId('location')).toHaveTextContent('/map?keep=yes');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  expect(screen.queryByLabelText('Карточка дельты')).not.toBeInTheDocument();
  expect(document.documentElement).not.toHaveAttribute('data-delta-desktop-inspector');
  expect(view.container.querySelector('.has-mobile-delta-card')).not.toBeInTheDocument();
 });
});

describe('DeltaMapPage request deduplication',()=>{
 it('смена фильтра запускает один запрос с последними bounds, одинаковые bounds не повторяют цикл', async()=>{
  vi.stubEnv('VITE_APP_MODE','production'); vi.stubEnv('VITE_SUPABASE_URL','https://example.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','key');
  const listDeltasInView=vi.fn().mockResolvedValue([]);
  vi.doMock('../../lib/supabase/auth',()=>({ hasSupabaseSession: vi.fn().mockResolvedValue(true) }));
  vi.doMock('../../lib/supabase/api',()=>({ loadActiveTheme: vi.fn().mockResolvedValue({ circleId:'circle-1' }) }));
  vi.doMock('../deltas/deltaApi',()=>({
   DeltaApiError: class DeltaApiError extends Error { code: string; constructor(code: string){ super(code); this.code=code; } },
   listDeltasInView,
   loadDeltaCategories: vi.fn().mockResolvedValue([{ slug:'transport', title:'Транспорт', iconKey:'transport' }]),
   loadDeltaCities: vi.fn().mockResolvedValue([{ slug:'perm', centerLat:58.0105, centerLng:56.2502, defaultZoom:11.5 }]),
   getDeltaCard: vi.fn(), reactToDelta: vi.fn(),
  }));
  const Page=await loadPage();
  render(<MemoryRouter><Page/></MemoryRouter>);
  await screen.findByText('Направление');
  await userEvent.click(screen.getByText('viewport'));
  await waitFor(()=>expect(listDeltasInView).toHaveBeenCalledTimes(1));
  await userEvent.selectOptions(screen.getByLabelText('Направление'),'positive');
  await waitFor(()=>expect(listDeltasInView).toHaveBeenCalledTimes(2));
  expect(listDeltasInView).toHaveBeenLastCalledWith(expect.objectContaining({ minLat:57, minLng:55, maxLat:59, maxLng:57, direction:'positive' }));
  await userEvent.click(screen.getByText('viewport'));
  await new Promise((resolve)=>window.setTimeout(resolve,20));
  expect(listDeltasInView).toHaveBeenCalledTimes(2);
 });

 it('явный retry в error state повторяет запрос с теми же bounds, но обычный identical viewport дедуплицируется', async()=>{
  vi.stubEnv('VITE_APP_MODE','production'); vi.stubEnv('VITE_SUPABASE_URL','https://example.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','key');
  const listDeltasInView=vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([]);
  vi.doMock('../../lib/supabase/auth',()=>({ hasSupabaseSession: vi.fn().mockResolvedValue(true) }));
  vi.doMock('../../lib/supabase/api',()=>({ loadActiveTheme: vi.fn().mockResolvedValue({ circleId:'circle-1' }) }));
  vi.doMock('../deltas/deltaApi',()=>({
   DeltaApiError: class DeltaApiError extends Error { code: string; constructor(code: string){ super(code); this.code=code; } },
   listDeltasInView,
   loadDeltaCategories: vi.fn().mockResolvedValue([{ slug:'transport', title:'Транспорт', iconKey:'transport' }]),
   loadDeltaCities: vi.fn().mockResolvedValue([{ slug:'perm', centerLat:58.0105, centerLng:56.2502, defaultZoom:11.5 }]),
   getDeltaCard: vi.fn(), reactToDelta: vi.fn(),
  }));
  const Page=await loadPage();
  render(<MemoryRouter><Page/></MemoryRouter>);
  await screen.findByText('Направление');
  await userEvent.click(screen.getByText('viewport'));
  await waitFor(()=>expect(listDeltasInView).toHaveBeenCalledTimes(1));
  await userEvent.click(screen.getByText('viewport'));
  await new Promise((resolve)=>window.setTimeout(resolve,20));
  expect(listDeltasInView).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('Не удалось загрузить основу карты')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Повторить'}));
  await waitFor(()=>expect(listDeltasInView).toHaveBeenCalledTimes(2));
  expect(listDeltasInView).toHaveBeenLastCalledWith(expect.objectContaining({ minLat:57, minLng:55, maxLat:59, maxLng:57 }));
 });
});
