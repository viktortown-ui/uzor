import { useState } from 'react';
import type { WrappedReport } from '../wrappedTypes';

export function WrappedHeader({ report }: { report: WrappedReport }) {
  const [toast, setToast] = useState('');
  const shareText = report.shareText ?? `Мой Wrapped недели: ${report.summary.signalsThisWeek} сигналов, ${report.summary.confirmedSignals} подтверждено, точность ${report.summary.accuracy}%, статус — ${report.identity.title}.`;
  const share = async () => {
    if (typeof navigator.share === 'function') await navigator.share({ text: shareText, title: 'Личный Wrapped реальности' });
    else await navigator.clipboard?.writeText(shareText);
    setToast('Отчёт скопирован');
    window.setTimeout(() => setToast(''), 2200);
  };
  return <header className="wrapped-header">
    <div><p className="wrapped-eyebrow">{report.period.label} · {report.period.weekStart} — {report.period.weekEnd}</p><h1>Личный Wrapped реальности</h1><p className="wrapped-lead">Ваш личный отчёт: что вы заметили, где были правы и где опередили круг.</p></div>
    <div className="wrapped-controls"><span className="wrapped-period-pill">▣ Эта неделя</span><button type="button" onClick={share}><span>⌯</span>Поделиться</button>{toast && <em role="status">{toast}</em>}</div>
  </header>;
}
