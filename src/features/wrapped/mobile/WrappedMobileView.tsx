import { Link } from 'react-router-dom';
import type { WrappedReport } from '../wrappedTypes';
import { useWrappedShare } from '../useWrappedShare';
import './wrappedMobile.css';

const fmt = (n: number) => n.toLocaleString('ru-RU');
const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric' });
const periodLabel = (start: string, end: string) => {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return start && end ? `${start} — ${end}` : 'Эта неделя';
  return `${day.format(a)}–${day.format(b)} ${monthNames[b.getMonth()]}`;
};

export const wrappedWeekLabel = (count: number) => {
  const abs = Math.abs(count);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'недель';
  if (mod10 === 1) return 'неделя';
  if (mod10 >= 2 && mod10 <= 4) return 'недели';
  return 'недель';
};

function IdentityMark() {
  return (
    <div className="wrapped-mobile-mark" aria-hidden="true">
      <svg viewBox="0 0 112 112">
        <defs>
          <linearGradient id="wrappedMobileLine" x1="16" y1="80" x2="96" y2="26">
            <stop stopColor="#25ffb8" />
            <stop offset="1" stopColor="#20d7ff" />
          </linearGradient>
        </defs>
        <circle cx="56" cy="56" r="34" />
        <path d="M22 70c12-20 19-20 29 0 11-34 21-43 39-20" />
        <path d="M24 82h64" />
      </svg>
    </div>
  );
}

export function WrappedMobileView({ report }: { report: WrappedReport }) {
  const { share, status } = useWrappedShare(report);
  const explanation = report.identity.subtitle || report.explain[0] || 'Вы замечаете изменения раньше круга.';
  const themes = report.topThemes.filter((theme) => theme.share > 0).slice(0, 3);
  const [mainSignal, ...moreSignals] = report.rightSignals;
  const xpPercent = Math.min(100, Math.round((report.summary.xp / Math.max(report.summary.nextLevelXp, 1)) * 100));
  const scrollToConfirmed = () => {
    document.getElementById('wrapped-mobile-confirmed')?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  return (
    <article className="wrapped-mobile-root" data-testid="wrapped-mobile-root">
      <section className="wrapped-mobile-hero" aria-labelledby="wrapped-mobile-title">
        <div className="wrapped-mobile-topline">
          <span>{periodLabel(report.period.weekStart, report.period.weekEnd)}</span>
          <button type="button" onClick={share} aria-label="Поделиться Wrapped">Поделиться</button>
        </div>
        {status && <p className="wrapped-mobile-share-status" role="status">{status}</p>}
        <IdentityMark />
        <p className="wrapped-mobile-kicker">ИТОГ НЕДЕЛИ</p>
        <h1 id="wrapped-mobile-title">{report.identity.title}</h1>
        <p className="wrapped-mobile-subtitle">{explanation}</p>
        {report.identity.percentileText && <p className="wrapped-mobile-pill">{report.identity.percentileText}</p>}
        <div className="wrapped-mobile-evidence" aria-label="Краткие показатели недели">
          <div><strong>{fmt(report.summary.signalsThisWeek)}</strong><span>сигналов</span></div>
          <div><strong>{fmt(report.summary.confirmedSignals)}</strong><span>подтверждено</span></div>
          <div><strong>{report.summary.accuracy}%</strong><span>точность</span></div>
        </div>
        <Link className="wrapped-mobile-cta" to="/contribute">Добавить Дельту</Link>
        <button className="wrapped-mobile-cue" type="button" onClick={scrollToConfirmed}>Что подтвердил круг <span aria-hidden="true">↓</span></button>
      </section>
      <section className="wrapped-mobile-section" aria-labelledby="wrapped-mobile-themes-title">
        <h2 id="wrapped-mobile-themes-title">Что вы заметили</h2>
        {themes.length ? (
          <div className="wrapped-mobile-theme-list">
            {themes.map((theme, i) => (
              <article className="wrapped-mobile-theme-row" key={theme.label}>
                <span className="wrapped-mobile-theme-order">{i + 1}</span>
                <div>
                  <div className="wrapped-mobile-theme-main"><strong>{theme.label}</strong><b>{theme.share}%</b></div>
                  <i><u style={{ width: `${Math.min(100, theme.share)}%` }} /></i>
                  {theme.description && <p>{theme.description}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="wrapped-mobile-empty">
            <h3>Пока мало данных по темам</h3>
            <p>Добавьте несколько Дельт — здесь появятся изменения, которые вы замечаете чаще всего.</p>
            <Link to="/contribute">Добавить Дельту</Link>
          </div>
        )}
      </section>
      <section className="wrapped-mobile-section" id="wrapped-mobile-confirmed" aria-labelledby="wrapped-mobile-confirmed-title">
        <h2 id="wrapped-mobile-confirmed-title">Круг подтвердил</h2>
        {mainSignal ? (
          <div className="wrapped-mobile-confirmed-list">
            <article className="wrapped-mobile-confirmed-main">
              <p>✓ Подтверждено кругом</p>
              <h3>{mainSignal.title}</h3>
              {mainSignal.consequence && <span>{mainSignal.consequence}</span>}
              <small>{mainSignal.tag} · {mainSignal.time}</small>
              <em>{mainSignal.status}</em>
              <Link to="/map">Открыть карту</Link>
            </article>
            {moreSignals.slice(0, 2).map((signal) => <article className="wrapped-mobile-confirmed-row" key={`${signal.title}-${signal.time}`}><strong>{signal.title}</strong><span>{signal.tag} · {signal.time}</span></article>)}
          </div>
        ) : (
          <div className="wrapped-mobile-empty">
            <h3>Круг ещё проверяет ваши Дельты</h3>
            <p>Ваши наблюдения сохранены. Результат появится, когда другой участник независимо заметит похожее изменение.</p>
            <div className="wrapped-mobile-empty-actions"><Link to="/contribute">Добавить Дельту</Link><Link to="/map">Открыть карту</Link></div>
          </div>
        )}
      </section>
      <section className="wrapped-mobile-section" aria-labelledby="wrapped-mobile-progress-title">
        <h2 id="wrapped-mobile-progress-title">Ваш прогресс</h2>
        <div className="wrapped-mobile-progress-line"><strong>{report.progress.currentLevel}</strong><span>→</span><strong>{report.progress.nextLevel}</strong></div>
        <p className="wrapped-mobile-xp-text">{fmt(report.summary.xp)} / {fmt(report.summary.nextLevelXp)} XP</p>
        <div className="wrapped-mobile-progressbar" role="progressbar" aria-label="Прогресс XP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpPercent}><i style={{ width: `${xpPercent}%` }} /></div>
        <p className="wrapped-mobile-progress-note">{report.progress.nextLevelLocked ? 'Следующий уровень пока закрыт. ' : ''}Ещё {fmt(report.summary.xpToNextLevel)} XP до следующего уровня</p>
        <p className="wrapped-mobile-streak">Серия: {fmt(report.summary.weekStreak)} {wrappedWeekLabel(report.summary.weekStreak)}</p>
      </section>
      <section className="wrapped-mobile-close" aria-label="Следующее действие"><p>Замечайте изменения по ходу недели — следующий Wrapped станет точнее.</p><Link className="wrapped-mobile-cta" to="/contribute">Добавить Дельту</Link></section>
    </article>
  );
}
