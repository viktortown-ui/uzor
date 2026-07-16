import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestMobileGeolocation } from './mobileGeolocation';

afterEach(() => vi.unstubAllGlobals());

describe('requestMobileGeolocation', () => {
  it('reports unavailable geolocation in Russian', async () => {
    vi.stubGlobal('navigator', {});
    await expect(requestMobileGeolocation()).resolves.toEqual({
      ok: false,
      message: 'Геолокация недоступна. Выберите точку на карте.',
    });
  });

  it('returns coordinates and maps denial and timeout to non-fatal messages', async () => {
    const getCurrentPosition = vi.fn<(success: PositionCallback, failure?: PositionErrorCallback) => void>((success) => success({
      coords: { latitude: 58.01, longitude: 56.25 },
    } as GeolocationPosition));
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    await expect(requestMobileGeolocation()).resolves.toEqual({ ok: true, lat: 58.01, lng: 56.25 });

    getCurrentPosition.mockImplementationOnce((_success, failure) => failure?.({ code: 1 } as GeolocationPositionError));
    expect((await requestMobileGeolocation()).ok).toBe(false);
    getCurrentPosition.mockImplementationOnce((_success, failure) => failure?.({ code: 3 } as GeolocationPositionError));
    await expect(requestMobileGeolocation()).resolves.toMatchObject({ ok: false, message: expect.stringContaining('вовремя') });
  });
});
