import type { WrappedReport } from './wrappedTypes';
import { WrappedCard } from './components/WrappedCard';
import { WrappedHeader } from './components/WrappedHeader';
import { WrappedHero } from './components/WrappedHero';
import { WrappedMetricCards } from './components/WrappedMetricCards';
import { WrappedProgress } from './components/WrappedProgress';
import { WrappedRightSignals } from './components/WrappedRightSignals';
import { WrappedSidebar } from './components/WrappedSidebar';
import { WrappedTopThemes } from './components/WrappedTopThemes';

export function WrappedDesktopView({ report }: { report: WrappedReport }) {
  return <div className="wrapped-dashboard wrapped-dashboard-mvp">
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
  </div>;
}
