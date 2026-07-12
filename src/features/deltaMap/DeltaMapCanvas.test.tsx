import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeltaMapItem } from '../deltas/deltaTypes';

const maps: MockMap[] = [];
const markerRemove = vi.fn();
class MockMap {
 handlers = new Map<string, Array<() => void>>();
 remove = vi.fn();
 flyTo = vi.fn();
 addControl = vi.fn();
 on = vi.fn((event: string, cb: () => void) => { this.handlers.set(event,[...(this.handlers.get(event) ?? []), cb]); return this; });
 getBounds = vi.fn(() => ({ getSouth: () => 57, getWest: () => 55, getNorth: () => 59, getEast: () => 57 }));
 constructor() { maps.push(this); }
 emit(event: string) { for (const cb of this.handlers.get(event) ?? []) cb(); }
}
const MapCtor = vi.fn(() => new MockMap());
const MarkerCtor = vi.fn(() => ({ setLngLat: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis(), remove: markerRemove }));
vi.mock('maplibre-gl',()=>({ default: { Map: MapCtor, Marker: MarkerCtor, NavigationControl: vi.fn(), GeolocateControl: vi.fn() } }));

const delta = (id: string): DeltaMapItem => ({ id, category:{slug:'transport',title:'Транспорт',iconKey:'transport'}, direction:'positive', statement:`Дельта ${id}`, status:'new', confirmCount:1, disconfirmCount:0, confirmationTarget:3, priorityScore:.1, location:{lat:58,lng:56,label:'Пермь'}, lastActivityAt:'2026-07-10T00:00:00.000Z' });
async function loadCanvas() { return (await import('./DeltaMapCanvas')).DeltaMapCanvas; }
afterEach(()=>{ cleanup(); maps.length=0; MapCtor.mockClear(); MarkerCtor.mockClear(); markerRemove.mockClear(); vi.resetModules(); });

describe('DeltaMapCanvas lifecycle',()=>{
 it('не пересоздаёт MapLibre при смене onViewport', async()=>{ const Canvas=await loadCanvas(); const first=vi.fn(); const { rerender }=render(<Canvas deltas={[]} onViewport={first} onSelect={vi.fn()} />); maps[0].emit('load'); const second=vi.fn(); rerender(<Canvas deltas={[]} onViewport={second} onSelect={vi.fn()} />); expect(MapCtor).toHaveBeenCalledTimes(1); expect(maps[0].remove).not.toHaveBeenCalled(); });
 it('не пересоздаёт MapLibre при изменении markers', async()=>{ const Canvas=await loadCanvas(); const { rerender }=render(<Canvas deltas={[delta('1')]} onViewport={vi.fn()} onSelect={vi.fn()} />); maps[0].emit('load'); rerender(<Canvas deltas={[delta('1'),delta('2')]} onViewport={vi.fn()} onSelect={vi.fn()} />); expect(MapCtor).toHaveBeenCalledTimes(1); expect(maps[0].remove).not.toHaveBeenCalled(); expect(MarkerCtor).toHaveBeenCalled(); });
 it('не пересоздаёт MapLibre при изменении city camera target', async()=>{ const Canvas=await loadCanvas(); const { rerender }=render(<Canvas city={{lat:58,lng:56,zoom:11}} deltas={[]} onViewport={vi.fn()} onSelect={vi.fn()} />); maps[0].emit('load'); rerender(<Canvas city={{lat:58.2,lng:56.2,zoom:12}} deltas={[]} onViewport={vi.fn()} onSelect={vi.fn()} />); expect(MapCtor).toHaveBeenCalledTimes(1); expect(maps[0].remove).not.toHaveBeenCalled(); expect(maps[0].flyTo).toHaveBeenCalledWith({ center:[56.2,58.2], zoom:12, essential:false }); });
 it('использует актуальный onViewport после rerender', async()=>{ vi.useFakeTimers(); const Canvas=await loadCanvas(); const first=vi.fn(); const second=vi.fn(); const { rerender }=render(<Canvas deltas={[]} onViewport={first} onSelect={vi.fn()} />); maps[0].emit('load'); rerender(<Canvas deltas={[]} onViewport={second} onSelect={vi.fn()} />); maps[0].emit('moveend'); vi.advanceTimersByTime(350); expect(second).toHaveBeenCalledWith({ minLat:57, minLng:55, maxLat:59, maxLng:57 }); vi.useRealTimers(); });
 it('кнопка «К центру Перми» через parent reset двигает существующую карту ровно один раз', async()=>{ const Canvas=await loadCanvas(); const { rerender }=render(<Canvas deltas={[]} onViewport={vi.fn()} onSelect={vi.fn()} onResetPerm={vi.fn()} permResetKey={0} />); maps[0].emit('load'); await waitFor(()=>expect(maps[0].flyTo).toHaveBeenCalled()); maps[0].flyTo.mockClear(); await userEvent.click(screen.getByRole('button',{name:'К центру Перми'})); rerender(<Canvas deltas={[]} onViewport={vi.fn()} onSelect={vi.fn()} onResetPerm={vi.fn()} permResetKey={1} />); expect(MapCtor).toHaveBeenCalledTimes(1); expect(maps[0].remove).not.toHaveBeenCalled(); expect(maps[0].flyTo).toHaveBeenCalledTimes(1); expect(maps[0].flyTo).toHaveBeenCalledWith({ center:[56.2502,58.0105], zoom:11.5, essential:false }); });
 it('явный retry после constructor error создаёт новую карту', async()=>{ MapCtor.mockImplementationOnce(()=>{ throw new Error('boom'); }).mockImplementation(()=>new MockMap()); const Canvas=await loadCanvas(); render(<Canvas deltas={[]} onViewport={vi.fn()} onSelect={vi.fn()} />); await screen.findByRole('alert'); await userEvent.click(screen.getByRole('button',{name:'Повторить'})); expect(MapCtor).toHaveBeenCalledTimes(2); });
 it('явный retry после ошибки существующей карты удаляет старую карту только через cleanup', async()=>{ const Canvas=await loadCanvas(); render(<Canvas deltas={[]} onViewport={vi.fn()} onSelect={vi.fn()} />); const firstMap=maps[0]; firstMap.emit('load'); firstMap.emit('error'); await screen.findByRole('alert'); await userEvent.click(screen.getByRole('button',{name:'Повторить'})); expect(MapCtor).toHaveBeenCalledTimes(2); expect(maps[1]).toBeDefined(); expect(firstMap.remove).toHaveBeenCalledTimes(1); });
});
