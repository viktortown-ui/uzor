import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isDemoMode, isProductionConfigured } from '../../app/appMode';
import { ProductShell } from '../../app/ProductShell';
import { getMyWrappedReport, WrappedApiError } from '../wrapped/wrappedApi';
import { wrappedDemoReport } from '../wrapped/wrappedDemoData';
import { normalizeWrappedReport } from '../wrapped/wrappedLogic';
import type { WrappedReport } from '../wrapped/wrappedTypes';
import './mobilePulse.css';

export type PulseState = 'loading' | 'ready' | 'empty' | 'join' | 'error';

export function getInitialPulseState({ demoMode, productionConfigured, demoReportEmpty }: { demoMode: boolean; productionConfigured: boolean; demoReportEmpty: boolean }): PulseState {
  if (demoMode) return demoReportEmpty ? 'empty' : 'ready';
  if (productionConfigured) return 'loading';
  return 'error';
}

function PulseField() {
  return <div className="mobile-pulse-field" aria-hidden="true"><svg viewBox="0 0 280 170" focusable="false"><defs><radialGradient id="pulseCore" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#efffff"/><stop offset="0.42" stopColor="#20e6ce"/><stop offset="1" stopColor="#24cfea" stopOpacity="0"/></radialGradient></defs><circle className="mobile-pulse-field__halo" cx="140" cy="84" r="54"/><circle className="mobile-pulse-field__ring" cx="140" cy="84" r="34"/><path className="mobile-pulse-field__line" d="M70 52Q110 72 140 84T214 58"/><path className="mobile-pulse-field__line soft" d="M64 121Q108 100 140 84T216 118"/><circle className="mobile-pulse-field__node" cx="70" cy="52" r="4"/><circle className="mobile-pulse-field__node" cx="214" cy="58" r="4"/><circle className="mobile-pulse-field__node" cx="64" cy="121" r="3.5"/><circle className="mobile-pulse-field__node" cx="216" cy="118" r="3.5"/><circle className="mobile-pulse-field__core" cx="140" cy="84" r="12" fill="url(#pulseCore)"/></svg></div>;
}

export function TraceContent({ state, report }: { state: PulseState; report: WrappedReport }) {
  if (state === 'loading') return <div className="mobile-pulse-trace__loading" role="status"><span>Собираем ваш след…</span><i /><i /></div>;
  if (state === 'join') return <div className="mobile-pulse-trace__message"><p>Подключитесь к кругу, чтобы видеть личный прогресс.</p><Link to="/join">Войти по приглашению</Link></div>;
  if (state === 'error') return <div className="mobile-pulse-trace__message" role="alert"><p>Личный итог сейчас не загрузился. Карта и добавление наблюдений доступны.</p></div>;
  if (state === 'empty') return <div className="mobile-pulse-trace__message"><strong>Личный итог ещё собирается</strong><p>Добавляйте наблюдения по ходу недели. Когда данных станет достаточно, здесь появится итог недели.</p><Link to="/contribute">Добавить первую Дельту</Link></div>;
  return <div className="mobile-pulse-summary"><div><strong>{report.summary.signalsThisWeek}</strong><span>за неделю</span></div><div><strong>{report.summary.confirmedSignals}</strong><span>подтверждено</span></div><div><strong>{report.summary.weekStreak}</strong><span>серия</span></div><Link to="/wrapped">Открыть итог недели</Link></div>;
}

export function MobilePulsePage() {
  const [state, setState] = useState<PulseState>(() => getInitialPulseState({
    demoMode: isDemoMode,
    productionConfigured: isProductionConfigured,
    demoReportEmpty: Boolean(wrappedDemoReport.isEmpty),
  }));
  const [report, setReport] = useState<WrappedReport>(wrappedDemoReport);

  useEffect(() => {
    if (isDemoMode) return;
    if (!isProductionConfigured) return;
    void getMyWrappedReport().then((value) => {
      const normalized = normalizeWrappedReport(value);
      setReport(normalized);
      setState(normalized.isEmpty ? 'empty' : 'ready');
    }).catch((error) => {
      if (error instanceof WrappedApiError && (error.kind === 'no-session' || error.kind === 'no-circle')) setState('join');
      else setState('error');
    });
  }, []);

  return <ProductShell className="mobile-pulse-shell"><section className="mobile-pulse-page"><div className="mobile-pulse-first-screen"><div className="mobile-pulse-context"><span>УЗОР</span><span>Пермь</span></div><div className="mobile-pulse-hero"><h1>Что меняется рядом?</h1><p>Смотрите изменения, которые люди уже заметили, или добавьте собственное наблюдение.</p></div><PulseField /><div className="mobile-pulse-actions"><Link className="mobile-pulse-primary" to="/map">Посмотреть изменения рядом</Link><Link className="mobile-pulse-secondary" to="/contribute">Добавить Дельту</Link></div><div className="mobile-pulse-scroll-cue" aria-hidden="true">↓</div></div><section className="mobile-pulse-trace" aria-labelledby="mobile-pulse-trace-title"><h2 id="mobile-pulse-trace-title">Ваш след</h2><TraceContent state={state} report={report} /></section></section></ProductShell>;
}
