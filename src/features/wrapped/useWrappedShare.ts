import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WrappedReport } from './wrappedTypes';

export function useWrappedShare(report: WrappedReport) {
  const [status, setStatus] = useState('');
  const timerRef = useRef<number | undefined>(undefined);
  const shareText = useMemo(() => report.shareText ?? `Мой Wrapped недели: ${report.summary.signalsThisWeek} сигналов, ${report.summary.confirmedSignals} подтверждено, точность ${report.summary.accuracy}%, статус — ${report.identity.title}.`, [report]);

  const share = useCallback(async () => {
    try {
      if (typeof navigator.share === 'function') await navigator.share({ text: shareText, title: 'Личный Wrapped реальности' });
      else await navigator.clipboard?.writeText(shareText);
      setStatus('Отчёт скопирован');
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setStatus(''), 2200);
    } catch {
      // Пользователь мог отменить системный share sheet. Страница не должна падать.
    }
  }, [shareText]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { share, status };
}
