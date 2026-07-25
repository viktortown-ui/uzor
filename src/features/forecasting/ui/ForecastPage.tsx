import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductShell } from '../../../app/ProductShell';
import { isProductionConfigured } from '../../../app/appMode';
import { ForecastApiError, forecastErrorMessage, getForecastWorkspace, submitForecast } from '../api/forecastApi';
import type { ForecastWorkspace } from '../api/forecastApiTypes';
import { FORECAST_DOMAIN_VERSION } from '../types';
import { ForecastCard } from './ForecastCard';
import { createInteractiveDemoEvent } from './forecastUiLogic';
import './forecastUi.css';

export function ForecastPage() {
  if (isProductionConfigured) return <ProductionForecastPage/>;
  const event = createInteractiveDemoEvent();
  return <ProductShell className="forecast-shell"><div className="forecast-page"><header className="forecast-page__header"><Link to="/pulse" className="forecast-back">← Вернуться в Пульс</Link><p className="forecast-kicker">ПРОГНОЗЫ · ДЕМО</p><h1>Сформулируйте проверяемый прогноз</h1><p>Выберите конкретный исход и честно укажите свою вероятность. Это не наблюдение-Дельта и не коллективная статистика.</p></header><ForecastCard event={event} /></div></ProductShell>;
}

const SANDBOX_EVENT_ID='sandbox-demo-milk-price-2026-12-15';
function ProductionForecastPage(){const [workspace,setWorkspace]=useState<ForecastWorkspace|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [saving,setSaving]=useState(false);const [savedAt,setSavedAt]=useState<string>();const savingRef=useRef(false);
 const load=useCallback(async(clearError=true)=>{setLoading(true);if(clearError)setError('');try{setWorkspace(await getForecastWorkspace(SANDBOX_EVENT_ID));}catch(e){setError(forecastErrorMessage(e));}finally{setLoading(false);}},[]);useEffect(()=>{getForecastWorkspace(SANDBOX_EVENT_ID).then(setWorkspace).catch(e=>setError(forecastErrorMessage(e))).finally(()=>setLoading(false));},[]);
 const save=async(value:{optionId:string;probability:number;reasoning?:string})=>{if(savingRef.current)return;savingRef.current=true;setSaving(true);setError('');try{const result=await submitForecast({eventId:SANDBOX_EVENT_ID,...value,version:FORECAST_DOMAIN_VERSION});setSavedAt(result.serverTimestamp);setWorkspace(current=>current&&({...current,forecast:result.forecast,locked:result.locked}));}catch(e){const message=forecastErrorMessage(e);setError(message);setSavedAt(undefined);if(e instanceof ForecastApiError&&e.code==='forecast_deadline_passed'){await load(false);setError(message);}}finally{savingRef.current=false;setSaving(false);}};
 const missing=!workspace?.event||workspace.lockReason==='event_not_found';
 return <ProductShell className="forecast-shell"><div className="forecast-page"><header className="forecast-page__header"><Link to="/pulse" className="forecast-back">← Вернуться в Пульс</Link><p className="forecast-kicker">ПРОГНОЗЫ</p><h1>Сформулируйте проверяемый прогноз</h1></header>{loading&&!workspace?<p>Загружаем событие и ваш прогноз…</p>:missing?<div role="alert"><p>{error||'Событие не найдено.'}</p><button onClick={()=>void load()}>Повторить</button></div>:<ForecastCard key={`${workspace.forecast?.updatedAt??'new'}-${workspace.lockReason??'open'}`} event={workspace.event!} production={{event:workspace.event!,initialForecast:workspace.forecast,submissionPermitted:workspace.submissionPermitted,locked:workspace.locked,lockReason:workspace.lockReason,authenticationRequired:workspace.authenticationRequired,saving,error,savedAt,onSubmit:value=>void save(value)}}/>}</div></ProductShell>}
