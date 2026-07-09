import type { WrappedReport } from '../wrappedTypes';
import { WrappedCard } from './WrappedCard';

const accent = ['pink', 'blue', 'cyan', 'violet', 'green'] as const;

function SummaryIllustration({ index }: { index: number }) {
  const common = { viewBox: '0 0 96 74', 'aria-hidden': true, focusable: false } as const;
  if (index === 0) return <svg {...common}><path className="topic-orbit" d="M13 51c18-15 49-18 70-5M17 60c17-8 41-12 62-3"/><path className="topic-car" d="M25 45h46l-5-14H34l-9 14Zm3 0v10m40-10v10M33 55h1m28 0h1"/><circle className="topic-car" cx="34" cy="55" r="7"/><circle className="topic-car" cx="63" cy="55" r="7"/></svg>;
  if (index === 1) return <svg {...common}><circle className="orb-ring" cx="48" cy="38" r="25"/><path className="orb-check" d="M35 39l9 9 19-22"/></svg>;
  if (index === 2) return <svg {...common}><circle className="ring-muted" cx="48" cy="38" r="25"/><path className="ring-main" d="M48 13a25 25 0 1 1-23 35"/><circle className="ring-core" cx="48" cy="38" r="10"/></svg>;
  if (index === 3) return <svg {...common}><path className="bolt-orbit" d="M19 57c17-11 42-14 61-4"/><path className="bolt-main" d="M55 8 31 43h18l-7 25 25-38H49l6-22Z"/></svg>;
  return <svg {...common}><path className="shield-main" d="M48 9 72 19v19c0 16-10 25-24 31-14-6-24-15-24-31V19L48 9Z"/><path className="shield-glasses" d="M33 38c0-5 4-8 9-8s8 3 8 8-3 8-8 8-9-3-9-8Zm13 0h4m4 0c0-5 4-8 9-8s8 3 8 8-3 8-8 8-9-3-9-8Z"/></svg>;
}

export function WrappedHero({ report }: { report: WrappedReport }) {
  const items = [
    ['Главная тема недели', report.mainTheme.label || 'Темы собираются', report.mainTheme.description || 'Добавьте сигналы — и контур покажет фокус недели.'],
    [`${report.summary.confirmedSignals} ваших сигнала подтвердились`, 'подтвердились', report.summary.confirmedSignals ? 'Отличная интуиция и чтение контекста.' : 'Пока мало независимых подтверждений, но структура уже собирается.'],
    ['Точность ожиданий', `${report.summary.accuracy}%`, report.summary.accuracy ? 'Ваши сигналы совпали с откликами круга.' : 'Нужно больше подтверждённых исходов для оценки.'],
    [`${report.summary.earlySignals} раз вы были`, 'раньше других', report.summary.earlySignals ? 'Ваш сигнал опередил круг.' : 'Пока без ранних подтверждений.'],
    ['Ваш стиль', report.identity.style || 'Наблюдатель', 'Вы взвешиваете риски и проверяете факты.'],
  ];

  return <div className="wrapped-hero-grid">
    <WrappedCard className="wrapped-hero-card">
      <div className="wrapped-hero-visual" aria-hidden="true">
        <svg viewBox="0 0 190 190"><defs><linearGradient id="heroGlow" x1="0" x2="1"><stop stopColor="#1df7ff"/><stop offset="1" stopColor="#25ffb8"/></linearGradient></defs><circle cx="95" cy="95" r="72"/><path d="M43 132 83 82l18 25 16-36 34 61"/><path d="M95 44v32M79 60h32M63 88h24M119 88h24"/><path className="hero-pulse-line" d="M28 95h34l9-16 11 34 11-47 10 29h59"/></svg>
      </div>
      <div className="wrapped-hero-copy"><p>Ваш итог недели</p><h2>{report.identity.title}</h2><span>{report.identity.subtitle}</span>{report.identity.percentileText && <b>{report.identity.percentileText}</b>}</div>
    </WrappedCard>
    {items.map(([k, title, text], i) => <WrappedCard delay={(i + 1) * .04} className={`wrapped-summary-card ${accent[i]}`} key={`${k}-${title}`}><div className="summary-icon"><SummaryIllustration index={i} /></div><p>{k}</p><h3>{title}</h3><span>{text}</span></WrappedCard>)}
  </div>;
}
