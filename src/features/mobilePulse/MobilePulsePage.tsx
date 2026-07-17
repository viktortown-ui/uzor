import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isDemoMode, isProductionConfigured } from '../../app/appMode';
import { ProductShell } from '../../app/ProductShell';
import { formatDistance, isWithinPermMvpArea } from '../deltaCreate/deltaGeoLogic';
import { getMyWrappedReport, WrappedApiError } from '../wrapped/wrappedApi';
import { wrappedDemoReport } from '../wrapped/wrappedDemoData';
import { normalizeWrappedReport } from '../wrapped/wrappedLogic';
import type { WrappedReport } from '../wrapped/wrappedTypes';
import { loadMobilePulseData, MobilePulseJoinError } from './mobilePulseData';
import { sortNearby } from './mobilePulseLogic';
import type { CityPulseState, MobilePulseData, MobilePulseItem, PersonalTraceState } from './mobilePulseTypes';
import './mobilePulse.css';

export type PulseState = PersonalTraceState;
export function getInitialPulseState({ demoMode, productionConfigured, demoReportEmpty }: { demoMode:boolean; productionConfigured:boolean; demoReportEmpty:boolean }): PulseState { return demoMode ? (demoReportEmpty?'empty':'ready') : productionConfigured?'loading':'error'; }
const statusLabels = { new:'Новая', checking:'Проверяется', confirmed:'Подтверждена', fork:'Развилка', archived:'Архив' } as const;
function activityCopy(value:string) { const ms=Date.now()-Date.parse(value); if(!Number.isFinite(ms)) return 'время активности неизвестно'; const minutes=Math.max(0,Math.floor(ms/60000)); if(minutes<60) return `активность ${minutes || 1} мин. назад`; const hours=Math.floor(minutes/60); if(hours<24) return `активность ${hours} ч. назад`; return `активность ${Math.floor(hours/24)} дн. назад`; }

export function TraceContent({ state, report, retry }: { state:PersonalTraceState; report:WrappedReport; retry?:()=>void }) {
 if(state==='loading') return <div className="mobile-pulse-state" role="status">Собираем ваш след…</div>;
 if(state==='join') return <div className="mobile-pulse-state"><p>Подключитесь к кругу, чтобы видеть личный прогресс.</p><Link to="/join">Войти по приглашению</Link></div>;
 if(state==='error') return <div className="mobile-pulse-state" role="alert"><p>Личный итог сейчас не загрузился.</p><button onClick={retry}>Повторить</button></div>;
 if(state==='empty') return <div className="mobile-pulse-state"><p>Личный итог ещё собирается. Добавьте первое наблюдение.</p><Link to="/contribute">Добавить первую Дельту</Link></div>;
 return <div className="mobile-pulse-personal-metrics"><div><strong>{report.summary.signalsThisWeek}</strong><span>Добавлено</span></div><div><strong>{report.summary.confirmedSignals}</strong><span>Подтверждено</span></div><div><strong>{report.summary.weekStreak}</strong><span>Серия недель</span></div><Link to="/wrapped">Открыть итог недели</Link></div>;
}
function DeltaFeed({items}:{items:MobilePulseItem[]}) { return <ul className="mobile-pulse-feed">{items.map(item=><li key={item.id} data-direction={item.direction}><Link to={`/map?delta=${encodeURIComponent(item.id)}`} aria-label={`${item.title}, ${statusLabels[item.status]}`}><strong>{item.title}</strong><span>{item.categoryTitle} · {statusLabels[item.status]}{item.confirmCount>1?` · подтверждений ${item.confirmCount}`:''}</span><span>{item.locationLabel} · {item.distanceMeters==null?activityCopy(item.lastActivityAt):formatDistance(item.distanceMeters)}</span></Link></li>)}</ul>; }

export function MobilePulsePage() {
 const [cityState,setCityState]=useState<CityPulseState>(isDemoMode?'loading':isProductionConfigured?'loading':'error');
 const [data,setData]=useState<MobilePulseData|null>(null); const [refreshing,setRefreshing]=useState(false); const citySeq=useRef(0);
 const [traceState,setTraceState]=useState<PersonalTraceState>(()=>getInitialPulseState({demoMode:isDemoMode,productionConfigured:isProductionConfigured,demoReportEmpty:Boolean(wrappedDemoReport.isEmpty)}));
 const [report,setReport]=useState(wrappedDemoReport); const traceSeq=useRef(0);
 const [nearby,setNearby]=useState<MobilePulseItem[]|null>(null); const [locationError,setLocationError]=useState('');
 const loadCity=useCallback(async()=>{ const seq=++citySeq.current; if(data) setRefreshing(true); else setCityState('loading'); try { const next=await loadMobilePulseData(); if(seq!==citySeq.current)return; setData(next); setNearby(null); setCityState(next.items.length?'ready':'empty'); } catch(error){if(seq!==citySeq.current)return; setCityState(error instanceof MobilePulseJoinError?'join':'error');} finally {if(seq===citySeq.current)setRefreshing(false);} },[data]);
 const loadTrace=useCallback(async()=>{const seq=++traceSeq.current;if(isDemoMode)return; if(!isProductionConfigured){setTraceState('error');return;} setTraceState('loading');try{const next=normalizeWrappedReport(await getMyWrappedReport());if(seq!==traceSeq.current)return;setReport(next);setTraceState(next.isEmpty?'empty':'ready');}catch(error){if(seq!==traceSeq.current)return;setTraceState(error instanceof WrappedApiError&&(error.kind==='no-session'||error.kind==='no-circle')?'join':'error');}},[]);
 useEffect(()=>{const timer=window.setTimeout(()=>{void loadCity();void loadTrace();},0);return()=>{window.clearTimeout(timer);citySeq.current+=1;traceSeq.current+=1;}; // Requests own sequence guards intentionally isolate both sections.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const requestNearby=()=>{setLocationError('');if(!navigator.geolocation){setLocationError('Геопозиция недоступна. Показываем последние изменения в Перми.');return;}navigator.geolocation.getCurrentPosition(({coords})=>{if(!isWithinPermMvpArea(coords.latitude,coords.longitude)){setLocationError('Вы находитесь за пределами Перми. Показываем последние изменения в Перми.');return;}if(data)setNearby(sortNearby(data.items,coords.latitude,coords.longitude));},()=>setLocationError('Не удалось определить место. Показываем последние изменения в Перми.'),{timeout:10000,maximumAge:0});};
 const items=nearby??data?.items??[];
 return <ProductShell className="mobile-pulse-shell"><section className="mobile-pulse-page"><header className="mobile-pulse-header"><span>ПУЛЬС ПЕРМИ</span><button onClick={()=>void loadCity()} disabled={refreshing}>{refreshing?'Обновляем…':'Обновить'}</button></header><h1>Что изменилось рядом</h1><div className="mobile-pulse-refresh" aria-live="polite">{data&&!refreshing?`Обновлено в ${data.loadedAt.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}`:refreshing?'Обновляем…':''}</div>
 {cityState==='loading'&&<div className="mobile-pulse-state" role="status">Загружаем изменения Перми…</div>}
 {cityState==='join'&&<div className="mobile-pulse-state"><h2>Войдите в круг, чтобы видеть Пульс Перми</h2><Link to="/join">Войти по приглашению</Link></div>}
 {cityState==='error'&&<div className="mobile-pulse-state" role="alert"><h2>Не удалось загрузить Пульс Перми</h2><p>Карта и добавление Дельты остаются доступны.</p><button onClick={()=>void loadCity()}>Повторить</button><Link to="/map">Открыть карту</Link><Link to="/contribute">Добавить Дельту</Link></div>}
 {cityState==='empty'&&<div className="mobile-pulse-state"><h2>В Перми пока нет активных Дельт</h2><p>Отметьте первое заметное изменение — хорошее или плохое.</p><Link to="/contribute">Добавить Дельту</Link><Link to="/map">Открыть карту</Link></div>}
 {data&&cityState==='ready'&&<><dl className="mobile-pulse-summary"><div><dt>Активны за сутки</dt><dd>{data.summary.activeLast24Hours}</dd></div><div><dt>Проверяются</dt><dd>{data.summary.checkingNow}</dd></div><div><dt>Подтверждены</dt><dd>{data.summary.confirmedNow}</dd></div></dl><section className="mobile-pulse-city" aria-labelledby="city-feed-title"><div className="mobile-pulse-section-heading"><h2 id="city-feed-title">{nearby?'Рядом с вами':'Последние изменения в Перми'}</h2><button onClick={nearby?()=>setNearby(null):requestNearby}>{nearby?'Показать город':'Показать рядом со мной'}</button></div>{!nearby&&<p className="mobile-pulse-privacy">Геопозиция используется только для сортировки и не сохраняется.</p>}{locationError&&<p className="mobile-pulse-location-error" role="alert">{locationError}</p>}<DeltaFeed items={items}/></section><div className="mobile-pulse-actions"><Link to="/map">Открыть карту</Link><Link to="/contribute">Отметить изменение</Link></div></>}
 <section className="mobile-pulse-trace" aria-labelledby="trace-title"><h2 id="trace-title">Ваш след за неделю</h2><TraceContent state={traceState} report={report} retry={()=>void loadTrace()}/></section></section></ProductShell>;
}
