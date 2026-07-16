export type MobileGeolocationResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; message: string };

export function requestMobileGeolocation(): Promise<MobileGeolocationResult> {
  if (!navigator.geolocation) {
    return Promise.resolve({ ok: false, message: 'Геолокация недоступна. Выберите точку на карте.' });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ ok: true, lat: coords.latitude, lng: coords.longitude }),
      (error) => resolve({
        ok: false,
        message: error.code === 3
          ? 'Не удалось определить местоположение вовремя. Попробуйте ещё раз или выберите точку на карте.'
          : 'Доступ к местоположению не предоставлен. Выберите точку на карте.',
      }),
      { timeout: 10000, enableHighAccuracy: false },
    );
  });
}
