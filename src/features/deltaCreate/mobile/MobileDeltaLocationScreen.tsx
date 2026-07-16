import { useState, type RefObject } from 'react';
import { DELTA_CREATE_DISTRICTS, type DeltaCreateDraft } from '../deltaCreateTypes';
import { isWithinPermMvpArea, PERM_MVP_AREA_ERROR } from '../deltaGeoLogic';
import { requestMobileGeolocation } from './mobileGeolocation';
import { MobileDeltaMapPicker } from './MobileDeltaMapPicker';

type LocationSelection = {
  lat: number;
  lng: number;
  source: 'map' | 'geolocation';
  label: string;
  autoAdvance: boolean;
};

type Props = {
  draft: DeltaCreateDraft;
  update: (patch: Partial<DeltaCreateDraft>, changed?: string) => void;
  error: string;
  onError: (message: string) => void;
  onAccept: (selection: LocationSelection) => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
};

function locationLabel(source: 'map' | 'geolocation') {
  return source === 'geolocation' ? 'Моё местоположение в Перми' : 'Выбранная точка в Перми';
}

export function MobileDeltaLocationScreen({
  draft,
  update,
  error,
  onError,
  onAccept,
  headingRef,
}: Props) {
  const [locating, setLocating] = useState(false);

  const accept = (lat: number, lng: number, source: 'map' | 'geolocation', autoAdvance: boolean) => {
    if (!isWithinPermMvpArea(lat, lng)) {
      onError(PERM_MVP_AREA_ERROR);
      return;
    }
    onError('');
    onAccept({
      lat,
      lng,
      source,
      label: draft.locationHint.trim() || locationLabel(source),
      autoAdvance,
    });
  };

  const locate = async () => {
    setLocating(true);
    onError('');
    const result = await requestMobileGeolocation();
    setLocating(false);
    if (!result.ok) {
      onError(result.message);
      return;
    }
    accept(result.lat, result.lng, 'geolocation', true);
  };

  return (
    <section className="mobile-delta-location">
      <h1 ref={headingRef} tabIndex={-1}>Где это?</h1>
      <MobileDeltaMapPicker
        lat={draft.lat}
        lng={draft.lng}
        onPick={(lat, lng) => accept(lat, lng, 'map', false)}
      />
      <div className="mobile-delta-bottom-sheet">
        <strong className="mobile-location-observation">{draft.subject}</strong>
        <button className="mobile-delta-primary" type="button" disabled={locating} onClick={() => void locate()}>
          {locating ? 'Определяем место…' : 'Отметить рядом со мной'}
        </button>
        <p>Или коснитесь нужного места на карте</p>
        {draft.locationSource === 'map' && (
          <>
            <h2>Место выбрано</h2>
            <button
              className="mobile-delta-primary"
              type="button"
              onClick={() => {
                if (draft.lat == null || draft.lng == null) return;
                onAccept({
                  lat: draft.lat,
                  lng: draft.lng,
                  source: 'map',
                  label: draft.locationHint.trim() || draft.locationLabel || 'Выбранная точка в Перми',
                  autoAdvance: true,
                });
              }}
            >
              Использовать эту точку
            </button>
          </>
        )}
        {error && <p role="alert" className="mobile-delta-alert">{error}</p>}
        <details>
          <summary>Добавить ориентир</summary>
          <input
            value={draft.locationHint}
            maxLength={120}
            onChange={(event) => update({ locationHint: event.target.value })}
            placeholder="Остановка Попова или участок улицы Ленина"
          />
        </details>
        <details>
          <summary>Уточнить район</summary>
          <select
            value={draft.districtCode}
            onChange={(event) => {
              const district = DELTA_CREATE_DISTRICTS.find((item) => item.code === event.target.value);
              update({ districtCode: district?.code || '', districtLabel: district?.label || '' });
            }}
          >
            <option value="">Не уверен</option>
            {DELTA_CREATE_DISTRICTS.map((district) => (
              <option key={district.code} value={district.code}>{district.label}</option>
            ))}
          </select>
        </details>
      </div>
    </section>
  );
}
