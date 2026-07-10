import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(()=>{ cleanup(); vi.resetModules(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
async function loadPage(token?: string) {
 if (token) vi.stubEnv('VITE_MAPBOX_ACCESS_TOKEN', token);
 vi.doMock('./DeltaMapCanvas',()=>({ DeltaMapCanvas: ({ onViewport, onSelect, deltas }: { onViewport: (b: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => void; onSelect: (d: { id: string; statement: string }) => void; deltas: Array<{ id: string; statement: string }> }) => <div data-testid="mock-map"><button onClick={()=>onViewport({minLat:1,minLng:1,maxLat:2,maxLng:2})}>empty viewport</button><button onClick={()=>onViewport({minLat:57,minLng:55,maxLat:59,maxLng:57})}>viewport</button>{deltas.map((d)=><button key={d.id} onClick={()=>onSelect(d)}>{d.statement}</button>)}</div> }));
 const mod = await import('./DeltaMapPage');
 return mod.DeltaMapPage;
}
describe('DeltaMapPage component states',()=>{
 it('/map показывает missing token state без token', async()=>{ const Page=await loadPage(); render(<MemoryRouter><Page/></MemoryRouter>); expect(screen.getByText('Нужна настройка Mapbox')).toBeInTheDocument(); });
 it('/map показывает empty state и filters отображаются', async()=>{ const Page=await loadPage('pk.test'); render(<MemoryRouter><Page/></MemoryRouter>); expect(await screen.findByText('Направление')).toBeInTheDocument(); await userEvent.click(screen.getByText('empty viewport')); expect(await screen.findByText('В этой части карты пока нет дельт')).toBeInTheDocument(); });
 it('выбор marker открывает DeltaMapCard, confirm/disconfirm показывают effect', async()=>{ const Page=await loadPage('pk.test'); render(<MemoryRouter><Page/></MemoryRouter>); await userEvent.click(await screen.findByText('viewport')); await userEvent.click(await screen.findByText('Стало дольше ждать транспорт вечером.')); expect(await screen.findByLabelText('Карточка дельты')).toBeInTheDocument(); await userEvent.click(screen.getByRole('button',{name:'Подтверждаю'})); expect(await screen.findByText(/Ваш отклик усилил дельту/)).toBeInTheDocument(); await waitFor(()=>expect(screen.getByRole('button',{name:'Не подтверждаю'})).toBeEnabled()); await userEvent.click(screen.getByRole('button',{name:'Не подтверждаю'})); expect(await screen.findByText(/Вы создали развилку/)).toBeInTheDocument(); });
});
