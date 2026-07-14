import type { RefObject } from 'react';
import { DELTA_CREATE_DISTRICTS, type DeltaCreateDraft } from '../deltaCreateTypes';
import { MobileDeltaMapPicker } from './MobileDeltaMapPicker';

type Props = {
  draft: DeltaCreateDraft;
  update: (patch: Partial<DeltaCreateDraft>, changed?: string) => void;
  error: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
};

function locationLabel(source: 'map' | 'geolocation') {
  return source === 'geolocation' ? 'Моё местоположение в Перми' : 'Выбранная точка в Перми';
}

export function MobileDeltaLocationScreen({ draft, update, error, headingRef }: Props) {
  const pick = (lat: number, lng: number, source: 'map' | 'geolocation') => {
    update({
      lat,
      lng,
      locationSource: source,
      locationPrecision: 'point',
      locationLabel: draft.locationHint.trim() || locationLabel(source),
      selectedSimilarDeltaId: null,
      similarDecision: null,
    }, 'location');
  };

  return (
    <section className="mobile-delta-location">
      <h1 ref={headingRef} tabIndex={-1}>Где</h1>
      <MobileDeltaMapPicker lat={draft.lat} lng={draft.lng} onPick={pick} />
      <div className="mobile-delta-bottom-sheet">
        <h2>{draft.locationLabel ? 'Место выбрано' : 'Коснитесь карты'}</h2>
        <p>{draft.locationLabel || 'На общей карте будет показано примерное место.'}</p>
        {error && <p role="alert" className="mobile-delta-alert">{error}</p>}
        <details>
          <summary>Добавить ориентир</summary>
          <input
            value={draft.locationHint}
            maxLength={120}
            onChange={(event) => update({ locationHint: event.target.value, locationLabel: draft.lat != null ? event.target.value || draft.locationLabel : draft.locationLabel }, 'location')}
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
            {DELTA_CREATE_DISTRICTS.map((district) => <option key={district.code} value={district.code}>{district.label}</option>)}
          </select>
        </details>
      </div>
    </section>
  );
}
