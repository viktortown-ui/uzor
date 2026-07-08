import type { WrappedReport, WrappedSummary } from './wrappedTypes';

const nextLevelXp = 10000;

export function calculateAccuracy(confirmedSignals: number, signalsThisWeek: number): number {
  if (signalsThisWeek <= 0) return 0;
  return Math.round((confirmedSignals / signalsThisWeek) * 100);
}

export function calculateXp(signalsThisWeek: number, confirmedSignals: number, earlySignals: number, weekStreak: number): Pick<WrappedSummary, 'xp' | 'nextLevelXp' | 'xpToNextLevel'> {
  const xp = signalsThisWeek * 100 + confirmedSignals * 250 + earlySignals * 500 + Math.max(0, weekStreak) * 150;
  return { xp, nextLevelXp, xpToNextLevel: Math.max(0, nextLevelXp - xp) };
}

export function resolveObserverStyle(signalsThisWeek: number, accuracy: number, earlySignals: number): string {
  if (earlySignals >= 1) return 'Ранний наблюдатель';
  if (accuracy >= 70 && signalsThisWeek >= 5) return 'Точный прогнозист';
  if (signalsThisWeek >= 10) return 'Сигнальный разведчик';
  if (signalsThisWeek > 0 && signalsThisWeek <= 5 && accuracy >= 50) return 'Осторожный аналитик';
  return 'Новый наблюдатель';
}

export function normalizeWrappedReport(value: Partial<WrappedReport> | null | undefined): WrappedReport {
  const summaryBase = value?.summary ?? {} as Partial<WrappedSummary>;
  const accuracy = summaryBase.accuracy ?? calculateAccuracy(summaryBase.confirmedSignals ?? 0, summaryBase.signalsThisWeek ?? 0);
  const xp = calculateXp(summaryBase.signalsThisWeek ?? 0, summaryBase.confirmedSignals ?? 0, summaryBase.earlySignals ?? 0, summaryBase.weekStreak ?? 0);
  const style = value?.identity?.style ?? resolveObserverStyle(summaryBase.signalsThisWeek ?? 0, accuracy, summaryBase.earlySignals ?? 0);
  const report: WrappedReport = {
    period: value?.period ?? { weekStart: '', weekEnd: '', label: 'Эта неделя' },
    identity: value?.identity ?? { title: style, subtitle: 'Ваш личный отчёт ещё собирается.', style },
    summary: { signalsThisWeek: 0, confirmedSignals: 0, accuracy, earlySignals: 0, weekStreak: 0, ...summaryBase, ...xp },
    mainTheme: value?.mainTheme ?? { label: 'Пока данных мало', share: 0, description: 'Оставьте несколько сигналов, чтобы УЗОР собрал главную тему.' },
    topThemes: value?.topThemes ?? [],
    activity: value?.activity ?? [],
    rightSignals: value?.rightSignals ?? [],
    progress: value?.progress ?? { currentLevel: style, previousLevel: 'Первый след', nextLevel: 'Тренд-предвидец', nextLevelLocked: true },
    explain: value?.explain ?? ['Пока данных мало: оставьте несколько сигналов в течение недели.'],
    isEmpty: value?.isEmpty ?? ((summaryBase.signalsThisWeek ?? 0) === 0),
  };
  return report;
}
