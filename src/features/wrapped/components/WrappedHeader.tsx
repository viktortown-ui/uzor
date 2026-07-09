import type { WrappedReport } from '../wrappedTypes';

export function WrappedHeader({ report }: { report: WrappedReport }) {
  const share = () => void navigator.clipboard?.writeText(`Мой УЗОР Wrapped: ${report.identity.title}, точность ${report.summary.accuracy}%`);
  return <header className="wrapped-header">
    <div><p className="wrapped-eyebrow">{report.period.label} · {report.period.weekStart} — {report.period.weekEnd}</p><h1>Личный Wrapped реальности</h1><p className="wrapped-lead">Ваш личный отчёт: что вы заметили, где были правы и где опередили круг.</p></div>
    <div className="wrapped-controls"><button type="button"><span>▣</span>Эта неделя ▾</button><button type="button" onClick={share}><span>⌯</span>Поделиться</button></div>
  </header>;
}
