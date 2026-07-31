import { useCallback, useEffect, useRef, useState } from 'react';
import { isProductionConfigured } from '../../../app/appMode';
import { ForecastApiError, forecastErrorMessage, getForecastWorkspace, submitForecast } from '../api/forecastApi';
import type { ForecastWorkspace } from '../api/forecastApiTypes';
import { FORECAST_DOMAIN_VERSION } from '../types';
import { ForecastCard } from './ForecastCard';
import { ForecastOutcomeView } from './ForecastOutcomeView';
import { createInteractiveDemoEvent } from './forecastUiLogic';
import './forecastUi.css';

const SANDBOX_EVENT_ID = 'sandbox-demo-milk-price-2026-12-15';
export function CurrentForecastExample() {
  if (!isProductionConfigured) return <section className="forecast-example"><p>Демонстрационные данные не сохраняются.</p><ForecastCard event={createInteractiveDemoEvent()} /></section>;
  return <ProductionForecastExample />;
}
function ProductionForecastExample() {
  const [workspace, setWorkspace] = useState<ForecastWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>();
  const savingRef = useRef(false);
  const load = useCallback(async (clearError = true) => {
    setLoading(true); if (clearError) setError('');
    try { setWorkspace(await getForecastWorkspace(SANDBOX_EVENT_ID)); }
    catch (loadError) { setError(forecastErrorMessage(loadError)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  const save = async (value: { optionId: string; probability: number; reasoning?: string }) => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError('');
    try {
      const result = await submitForecast({ eventId: SANDBOX_EVENT_ID, ...value, version: FORECAST_DOMAIN_VERSION });
      setSavedAt(result.serverTimestamp);
      setWorkspace(current => current && ({ ...current, forecast: result.forecast, locked: result.locked }));
    } catch (saveError) {
      const message = forecastErrorMessage(saveError); setError(message); setSavedAt(undefined);
      if (saveError instanceof ForecastApiError && saveError.code === 'forecast_deadline_passed') { await load(false); setError(message); }
    } finally { savingRef.current = false; setSaving(false); }
  };
  const missing = !workspace?.event || workspace.lockReason === 'event_not_found';
  return <section className="forecast-example">
    {loading && !workspace ? <p role="status">Загружаем событие и ваш прогноз…</p> : missing ? <div role="alert"><p>{error || 'Событие не найдено.'}</p><button onClick={() => void load()}>Повторить загрузку прогноза</button></div> : workspace?.outcome ? <ForecastOutcomeView event={workspace.event!} outcome={workspace.outcome} forecast={workspace.forecast} score={workspace.score} /> : <ForecastCard key={`${workspace?.forecast?.updatedAt ?? 'new'}-${workspace?.lockReason ?? 'open'}`} event={workspace!.event!} production={{ event: workspace!.event!, initialForecast: workspace!.forecast, submissionPermitted: workspace!.submissionPermitted, locked: workspace!.locked, lockReason: workspace!.lockReason, authenticationRequired: workspace!.authenticationRequired, saving, error, savedAt, onSubmit: value => void save(value) }} />}
  </section>;
}
