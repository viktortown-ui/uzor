import type { RefObject } from 'react';
import { DELTA_CREATE_DISTRICTS, type DeltaCreateDraft } from '../deltaCreateTypes';
import { isWithinPermMvpArea } from '../deltaGeoLogic';
import { MobileDeltaMapPicker } from './MobileDeltaMapPicker';

type Props = {
  draft: DeltaCreateDraft;
  update: (patch: Partial<DeltaCreateDraft>, changed?: string) => void;
  error: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onContinue: (geolocation?: { lat: number; lng: number }) => void;
};

function locationLabel(source: 'map' | 'geolocation') {
  return source === 'geolocation' ? 'Моё местоположение в Перми' : 'Выбранная точка в Перми';
}

export function MobileDeltaLocationScreen({ draft, update, error, headingRef, onContinue }: Props) {
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
  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      if (!isWithinPermMvpArea(latitude, longitude)) return;
      update({ lat: latitude, lng: longitude, locationSource: 'geolocation', locationPrecision: 'point', locationLabel: draft.locationHint.trim() || locationLabel('geolocation'), selectedSimilarDeltaId: null, similarDecision: null }, 'location');
      onContinue({ lat: latitude, lng: longitude });
    }, () => undefined, { timeout: 10000, enableHighAccuracy: false });
  };

  return (
    <section className="mobile-delta-location">
      <h1 ref={headingRef} tabIndex={-1}>Где это?</h1>
      <MobileDeltaMapPicker lat={draft.lat} lng={draft.lng} onPick={pick} />
      <div className="mobile-delta-bottom-sheet">
        <strong className="mobile-location-observation">{draft.subject}</strong>
        <button className="mobile-delta-primary" type="button" onClick={locate}>Отметить рядом со мной</button>
        <p>Или коснитесь нужного места на карте</p>
        {draft.locationSource === 'map' && <><h2>Место выбрано</h2><button className="mobile-delta-primary" type="button" onClick={() => onContinue()}>Использовать эту точку</button></>}
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
