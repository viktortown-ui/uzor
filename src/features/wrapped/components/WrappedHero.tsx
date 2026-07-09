import { Link } from 'react-router-dom';
import type { WrappedReport } from '../wrappedTypes';
import { WrappedCard } from './WrappedCard';

export function WrappedHero({ report }: { report: WrappedReport }) {
  const explanation = report.identity.subtitle || report.explain[0] || 'Продолжайте добавлять сигналы — круг покажет, какие наблюдения подтвердились независимо.';
  return <WrappedCard className="wrapped-hero-card wrapped-hero-card-mvp">
    <div className="wrapped-hero-visual" aria-hidden="true">
      <svg viewBox="0 0 190 190"><defs><linearGradient id="heroGlow" x1="0" x2="1"><stop stopColor="#1df7ff"/><stop offset="1" stopColor="#25ffb8"/></linearGradient></defs><circle cx="95" cy="95" r="72"/><path d="M43 132 83 82l18 25 16-36 34 61"/><path d="M95 44v32M79 60h32M63 88h24M119 88h24"/><path className="hero-pulse-line" d="M28 95h34l9-16 11 34 11-47 10 29h59"/></svg>
    </div>
    <div className="wrapped-hero-copy"><p>Ваш итог недели</p><h2>{report.identity.title}</h2><span>{explanation}</span>{report.identity.percentileText && <b>{report.identity.percentileText}</b>}<Link className="wrapped-primary" to="/contribute">Добавить сигнал</Link></div>
  </WrappedCard>;
}
