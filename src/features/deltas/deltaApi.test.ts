import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDelta, DeltaApiError } from './deltaApi';

const rpc = vi.fn();
vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({ rpc }) }));

const input = {
  circleId: 'circle', citySlug: 'perm', categorySlug: 'transport', direction: 'positive' as const,
  subject: 'Автобус', changeType: 'faster' as const, statement: 'Автобус стал быстрее', details: null,
  observedWindow: 'today' as const, impactLevel: 'noticeable' as const, lat: 58.01, lng: 56.25,
  locationLabel: 'Пермь', locationPrecision: 'point' as const,
};

describe('Delta API errors', () => {
  beforeEach(() => rpc.mockReset());

  it.each(['outside_city_area', 'invalid_coordinates', 'city_not_found'] as const)('preserves recognised code %s', async (code) => {
    rpc.mockResolvedValue({ data: null, error: { message: `RPC rejected: ${code}` } });
    await expect(createDelta(input)).rejects.toMatchObject({ code });
  });

  it('maps unrelated server detail to unknown without exposing it as the Error message', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'create_delta failed for 00000000-0000-0000-0000-000000000000' } });
    const error = await createDelta(input).catch((caught) => caught);
    expect(error).toBeInstanceOf(DeltaApiError);
    expect(error).toMatchObject({ code: 'unknown', message: 'unknown' });
  });
});
