import { useEffect, useState } from 'react';
import { isDemoMode, isProductionConfigured } from '../../app/appMode';
import { getMyWrappedReport, WrappedApiError } from './wrappedApi';
import { wrappedDemoReport } from './wrappedDemoData';
import { normalizeWrappedReport } from './wrappedLogic';
import type { WrappedReport } from './wrappedTypes';
import { WrappedCard } from './components/WrappedCard';
import { WrappedHeader } from './components/WrappedHeader';
import { WrappedHero } from './components/WrappedHero';
import { WrappedMetricCards } from './components/WrappedMetricCards';
import { WrappedProgress } from './components/WrappedProgress';
import { WrappedRightSignals } from './components/WrappedRightSignals';
import { WrappedSidebar } from './components/WrappedSidebar';
import { WrappedState } from './components/WrappedState';
import { WrappedTopThemes } from './components/WrappedTopThemes';
import { ProductShell } from '../../app/ProductShell';
import './wrapped.css';

export function WrappedPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'join' | 'missing-rpc' | 'error'>(isDemoMode || !isProductionConfigured ? 'ready' : 'loading');
  const [report, setReport] = useState<WrappedReport>(wrappedDemoReport);

  useEffect(() => {
    if (isDemoMode || !isProductionConfigured) return;
    void getMyWrappedReport()
      .then((r) => {
        const normalized = normalizeWrappedReport(r);
        setReport(normalized);
        setState(normalized.isEmpty ? 'empty' : 'ready');
      })
      .catch((e) => {
        if (e instanceof WrappedApiError) {
          setState(e.kind === 'no-session' || e.kind === 'no-circle' ? 'join' : e.kind === 'missing-rpc' ? 'missing-rpc' : 'error');
          return;
        }
        console.error('[UZOR-WRAPPED]', e);
        setState('error');
      });
  }, []);

  if (state === 'empty') return <ProductShell><WrappedState title="Пока Wrapped не собран" body="Оставьте несколько наблюдений в течение недели — и здесь появится ваш личный отчёт." to="/contribute" label="Добавить Дельту" /></ProductShell>;
  if (state === 'join') return <ProductShell><WrappedState title="Войдите в закрытый круг" body="Wrapped собирается только для участников круга." to="/join" label="Войти по приглашению" /></ProductShell>;
  if (state === 'missing-rpc') return <ProductShell><WrappedState title="Нужно применить migration 005_fix_wrapped_report_sql_and_confirmation.sql" body="После применения Supabase RPC get_my_wrapped_report экран загрузит реальные агрегаты." /></ProductShell>;
  if (state === 'error') return <ProductShell><WrappedState title="Не удалось загрузить Wrapped" body="Проверьте соединение и попробуйте позже." /></ProductShell>;
  if (state === 'loading') return <ProductShell><WrappedState title="Собираем Wrapped" body="Сверяем ваши наблюдения с контуром круга…" /></ProductShell>;

  return (
    <ProductShell className="wrapped-page">
      <div className="wrapped-dashboard wrapped-dashboard-mvp">
        <WrappedSidebar report={report} />
        <WrappedHeader report={report} />
        <WrappedHero report={report} />
        <WrappedMetricCards report={report} />
        <div className="wrapped-mvp-grid">
          <WrappedCard className="wrapped-themes-card">
            <div className="wrapped-card-head"><h2>Что вы замечали</h2><span>топ-3 темы</span></div>
            <WrappedTopThemes themes={report.topThemes} />
          </WrappedCard>
          <WrappedCard className="wrapped-right-card">
            <div className="wrapped-card-head"><h2>Где вы были правы</h2><span>подтверждено кругом</span></div>
            <WrappedRightSignals signals={report.rightSignals} />
          </WrappedCard>
          <WrappedCard className="wrapped-progress-card wide">
            <div className="wrapped-card-head"><h2>Ваш прогресс</h2><span>уровень и XP</span></div>
            <WrappedProgress report={report} />
          </WrappedCard>
        </div>
      </div>
    </ProductShell>
  );
}
