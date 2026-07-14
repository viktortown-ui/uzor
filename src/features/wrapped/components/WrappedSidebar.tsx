import type { WrappedReport } from '../wrappedTypes';

export function WrappedSidebar({ report }: { report: WrappedReport }) {
  return <aside className="wrapped-status-card wrapped-status-card-inline" aria-label="Статус итога недели"><i>♨</i><div><small>Ваш статус</small><strong>{report.progress.currentLevel}</strong><em>Точность: {report.summary.accuracy}%</em></div></aside>;
}
