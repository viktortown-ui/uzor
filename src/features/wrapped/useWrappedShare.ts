import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WrappedReport } from './wrappedTypes';

type WrappedShareNavigator = Partial<Pick<Navigator, 'share' | 'clipboard'>>;
type WrappedShareResult = 'success' | 'failure' | 'cancelled';

export const wrappedShareText = (report: WrappedReport) => report.shareText ?? `Мой итог недели: ${report.summary.signalsThisWeek} сигналов, ${report.summary.confirmedSignals} подтверждено, точность ${report.summary.accuracy}%, статус — ${report.identity.title}.`;

export async function shareWrappedReportText(nav: WrappedShareNavigator, shareText: string): Promise<WrappedShareResult> {
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ text: shareText, title: 'Личный итог недели' });
      return 'success';
    } catch {
      return 'cancelled';
    }
  }

  if (typeof nav.clipboard?.writeText !== 'function') {
    return 'failure';
  }

  try {
    await nav.clipboard.writeText(shareText);
    return 'success';
  } catch {
    return 'failure';
  }
}

export function useWrappedShare(report: WrappedReport) {
  const [status, setStatus] = useState('');
  const timerRef = useRef<number | undefined>(undefined);
  const shareText = useMemo(() => wrappedShareText(report), [report]);

  const showStatus = useCallback((message: string) => {
    setStatus(message);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStatus(''), 2200);
  }, []);

  const share = useCallback(async () => {
    const result = await shareWrappedReportText(globalThis.navigator, shareText);

    if (result === 'success') {
      showStatus('Отчёт скопирован');
    }

    if (result === 'failure') {
      showStatus('Не удалось поделиться отчётом');
    }
  }, [shareText, showStatus]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { share, status };
}
