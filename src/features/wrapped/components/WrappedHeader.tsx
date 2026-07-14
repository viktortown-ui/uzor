import type { WrappedReport } from '../wrappedTypes';
import { useWrappedShare } from '../useWrappedShare';

export function WrappedHeader({ report }: { report: WrappedReport }) {
  const { share, status } = useWrappedShare(report);
  return <header className="wrapped-header">
    <div><p className="wrapped-eyebrow">{report.period.label} · {report.period.weekStart} — {report.period.weekEnd}</p><h1>Личный итог недели</h1><p className="wrapped-lead">Ваш личный отчёт: что вы заметили, где были правы и где опередили круг.</p></div>
    <div className="wrapped-controls"><span className="wrapped-period-pill">▣ Эта неделя</span><button type="button" onClick={share}><span>⌯</span>Поделиться</button>{status && <em role="status">{status}</em>}</div>
  </header>;
}
