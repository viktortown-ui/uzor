import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoDeltaMapData } from '../deltaMap/demoDeltaMapData';
import { PERM_FALLBACK } from '../deltaMap/deltaMapLogic';
import type { DeltaMapItem } from '../deltas/deltaTypes';
import { boundsFromCenterRadius, PERM_FALLBACK_RADIUS_M } from './mobilePulseLogic';

const mocks = vi.hoisted(() => ({
  mode: { demo: false, production: true },
  context: vi.fn(), cities: vi.fn(), list: vi.fn(), card: vi.fn(),
}));
vi.mock('../../app/appMode', () => ({
  get isDemoMode() { return mocks.mode.demo; },
  get isProductionConfigured() { return mocks.mode.production; },
}));
vi.mock('../deltaMap/deltaMapLogic', async (importOriginal) => ({
  ...await importOriginal<typeof import('../deltaMap/deltaMapLogic')>(),
  loadDeltaMapContext: mocks.context,
}));
vi.mock('../deltas/deltaApi', () => ({
  loadDeltaCities: mocks.cities,
  listDeltasInView: mocks.list,
  getDeltaCard: mocks.card,
}));

import { buildNearbyPulseItems, loadMobilePulseData, MobilePulseJoinError } from './mobilePulseData';

const rows = (count = 8): DeltaMapItem[] => demoDeltaMapData.slice(0, count).map((row, index) => ({
  ...row,
  id: `row-${index + 1}`,
  statement: `statement-${index + 1}`,
  lastActivityAt: new Date(Date.UTC(2026, 0, 10, 12 - index)).toISOString(),
  location: { ...row.location, lat: 58.0105 + index * .001, lng: 56.2502 },
}));

beforeEach(() => {
  mocks.mode.demo = false; mocks.mode.production = true;
  mocks.context.mockReset().mockResolvedValue({ circleId: 'circle', citySlug: 'perm' });
  mocks.cities.mockReset().mockResolvedValue([{ slug: 'perm', centerLat: 58.01, centerLng: 56.25, outskirtsDistanceM: 12_000 }]);
  mocks.list.mockReset().mockResolvedValue(rows());
  mocks.card.mockReset().mockImplementation(async (id: string) => ({ subject: `card-${id}` }));
});

describe('mobilePulseData', () => {
  it('production calls context, cities and one city viewport request', async () => {
    await loadMobilePulseData();
    expect(mocks.context).toHaveBeenCalledOnce(); expect(mocks.cities).toHaveBeenCalledOnce(); expect(mocks.list).toHaveBeenCalledOnce();
  });

  it('null context throws MobilePulseJoinError', async () => {
    mocks.context.mockResolvedValue(null);
    await expect(loadMobilePulseData()).rejects.toBeInstanceOf(MobilePulseJoinError);
    expect(mocks.cities).not.toHaveBeenCalled();
  });

  it('archived rows are excluded', async () => {
    const input = rows(3); input[1] = { ...input[1], status: 'archived' }; mocks.list.mockResolvedValue(input);
    const result = await loadMobilePulseData();
    expect(result.allItems.map(({ id }) => id)).toEqual(['row-1', 'row-3']); expect(result.items.map(({ id }) => id)).toEqual(['row-1', 'row-3']);
  });

  it('city mode sorts all rows and hydrates only the selected five', async () => {
    const input = rows().reverse(); mocks.list.mockResolvedValue(input);
    const result = await loadMobilePulseData();
    expect(result.items.map(({ id }) => id)).toEqual(['row-1', 'row-2', 'row-3', 'row-4', 'row-5']); expect(mocks.card).toHaveBeenCalledTimes(5);
  });

  it('getDeltaCard is not called for every city row', async () => {
    mocks.list.mockResolvedValue(rows(8)); await loadMobilePulseData(); expect(mocks.card).toHaveBeenCalledTimes(5);
  });

  it('one failed getDeltaCard uses the map statement fallback', async () => {
    mocks.card.mockImplementation(async (id: string) => { if (id === 'row-2') throw new Error('card'); return { subject: `card-${id}` }; });
    const result = await loadMobilePulseData(); expect(result.items[1].title).toBe('statement-2');
  });

  it('one failed card does not reject the complete city Pulse', async () => {
    mocks.card.mockRejectedValueOnce(new Error('card'));
    await expect(loadMobilePulseData()).resolves.toMatchObject({ items: { length: 5 } });
  });

  it('empty city data returns an empty result', async () => {
    mocks.list.mockResolvedValue([]); const result = await loadMobilePulseData(); expect(result.items).toEqual([]); expect(result.allItems).toEqual([]); expect(mocks.card).not.toHaveBeenCalled();
  });

  it('missing Perm metadata uses the documented fallback center and radius', async () => {
    mocks.cities.mockResolvedValue([]); await loadMobilePulseData();
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining(boundsFromCenterRadius(PERM_FALLBACK.lat, PERM_FALLBACK.lng, PERM_FALLBACK_RADIUS_M)));
  });

  it('nearby mode sorts all city rows before selecting five', async () => {
    const input = rows(); await buildNearbyPulseItems(input.reverse(), 58.0105, 56.2502);
    expect(mocks.card.mock.calls.map(([id]) => id)).toEqual(['row-1', 'row-2', 'row-3', 'row-4', 'row-5']);
  });

  it('the nearest row outside the newest-five group becomes first nearby', async () => {
    const input = rows(); input[7] = { ...input[7], location: { ...input[7].location, lat: 58.0105, lng: 56.2502 } };
    const result = await buildNearbyPulseItems(input, 58.0105, 56.2502); expect(result[0].id).toBe('row-1'); expect(result[1].id).toBe('row-8');
  });

  it('nearby mode hydrates only the selected nearest five', async () => {
    await buildNearbyPulseItems(rows(), 58.0105, 56.2502); expect(mocks.card).toHaveBeenCalledTimes(5);
  });

  it('demo rows are used only when isDemoMode is true', async () => {
    mocks.mode.demo = true; const result = await loadMobilePulseData();
    expect(result.allItems).toEqual(demoDeltaMapData.filter((row) => row.status !== 'archived')); expect(mocks.context).not.toHaveBeenCalled(); expect(mocks.list).not.toHaveBeenCalled();
  });

  it('production never falls back to demo rows', async () => {
    mocks.list.mockRejectedValue(new Error('offline'));
    await expect(loadMobilePulseData()).rejects.toThrow('offline'); expect(mocks.card).not.toHaveBeenCalled();
  });
});
