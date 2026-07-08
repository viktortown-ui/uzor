import { useEffect, useState } from 'react';
import { isDemoMode, isProductionConfigured } from '../../app/appMode';
import { getMyWrappedReport, WrappedApiError } from './wrappedApi';
import { wrappedDemoReport } from './wrappedDemoData';
import { normalizeWrappedReport } from './wrappedLogic';
import type { WrappedReport } from './wrappedTypes';
import { WrappedActivityChart } from './components/WrappedActivityChart';
import { WrappedCard } from './components/WrappedCard';
import { WrappedDonut } from './components/WrappedDonut';
import { WrappedHeader } from './components/WrappedHeader';
import { WrappedHero } from './components/WrappedHero';
import { WrappedMetricCards } from './components/WrappedMetricCards';
import { WrappedProgress } from './components/WrappedProgress';
import { WrappedRightSignals } from './components/WrappedRightSignals';
import { WrappedSidebar } from './components/WrappedSidebar';
import { WrappedState } from './components/WrappedState';
import { WrappedTopThemes } from './components/WrappedTopThemes';
import './wrapped.css';

export function WrappedPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'join' | 'missing-rpc' | 'error'>(isDemoMode || !isProductionConfigured ? 'ready' : 'loading');
  const [report, setReport] = useState<WrappedReport>(wrappedDemoReport);
  useEffect(() => { if (isDemoMode || !isProductionConfigured) return; void getMyWrappedReport().then((r) => { const normalized = normalizeWrappedReport(r); setReport(normalized); setState(normalized.isEmpty ? 'empty' : 'ready'); }).catch((e) => { if (e instanceof WrappedApiError) { setState(e.kind === 'no-session' || e.kind === 'no-circle' ? 'join' : e.kind === 'missing-rpc' ? 'missing-rpc' : 'error'); return; } console.error('[UZOR-WRAPPED]', e); setState('error'); }); }, []);
  if (state === 'empty') return <WrappedState title="Пока Wrapped не собран" body="Оставьте несколько сигналов в течение недели — и здесь появится ваш личный отчёт." to="/contribute" label="Добавить сигнал" />;
  if (state === 'join') return <WrappedState title="Войдите в закрытый круг" body="Wrapped собирается только для участников круга." to="/join" label="Войти по приглашению" />;
  if (state === 'missing-rpc') return <WrappedState title="Нужно применить migration 005_fix_wrapped_report_sql_and_confirmation.sql" body="После применения Supabase RPC get_my_wrapped_report экран загрузит реальные агрегаты." />;
  if (state === 'error') return <WrappedState title="Не удалось загрузить Wrapped" body="Проверьте Supabase migration 005 или попробуйте позже." />;
  if (state === 'loading') return <WrappedState title="Собираем Wrapped" body="Сверяем ваши сигналы с контуром круга…" />;
  return <div className="wrapped-page"><WrappedSidebar report={report}/><main className="wrapped-dashboard"><WrappedHeader report={report}/><WrappedHero report={report}/><div className="wrapped-mid-grid"><WrappedCard><h2>Ваша точность за неделю</h2><WrappedDonut value={report.summary.accuracy}/><ul>{report.explain.map((x) => <li key={x}>{x}</li>)}</ul></WrappedCard><WrappedCard className="wide"><h2>Активность сигналов</h2><WrappedActivityChart points={report.activity}/></WrappedCard><WrappedCard><h2>Что вы замечали</h2><WrappedTopThemes themes={report.topThemes}/></WrappedCard></div><div className="wrapped-bottom-grid"><WrappedCard><h2>Где вы были правы</h2><WrappedRightSignals signals={report.rightSignals}/></WrappedCard><WrappedCard><h2>Ваш прогресс</h2><WrappedProgress report={report}/></WrappedCard></div><WrappedMetricCards report={report}/></main></div>;
}
