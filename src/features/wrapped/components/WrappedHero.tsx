import type { WrappedReport } from '../wrappedTypes';
import { WrappedCard } from './WrappedCard';

const accent = ['pink', 'blue', 'cyan', 'violet', 'green'] as const;
const icons = ['🚘', '✓', '◌', 'ϟ', '♢'];

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
        <svg viewBox="0 0 190 190"><defs><linearGradient id="heroGlow" x1="0" x2="1"><stop stopColor="#1df7ff"/><stop offset="1" stopColor="#25ffb8"/></linearGradient></defs><circle cx="95" cy="95" r="72"/><path d="M43 132 83 82l18 25 16-36 34 61"/><path d="M95 44v32M79 60h32M63 88h24M119 88h24"/></svg>
      </div>
      <div className="wrapped-hero-copy"><p>Ваш итог недели</p><h2>{report.identity.title}</h2><span>{report.identity.subtitle}</span>{report.identity.percentileText && <b>{report.identity.percentileText}</b>}</div>
    </WrappedCard>
    {items.map(([k, title, text], i) => <WrappedCard delay={(i + 1) * .04} className={`wrapped-summary-card ${accent[i]}`} key={`${k}-${title}`}><div className="summary-icon">{icons[i]}</div><p>{k}</p><h3>{title}</h3><span>{text}</span></WrappedCard>)}
  </div>;
}
