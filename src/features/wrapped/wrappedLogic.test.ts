import { describe, expect, it } from 'vitest';
import { calculateAccuracy, calculateXp, normalizeWrappedReport, resolveObserverStyle } from './wrappedLogic';

describe('wrappedLogic', () => {
  it('calculates accuracy from confirmed signals', () => {
    expect(calculateAccuracy(14, 23)).toBe(61);
    expect(calculateAccuracy(0, 0)).toBe(0);
  });

  it('calculates XP and remaining XP', () => {
    expect(calculateXp(23, 14, 1, 3)).toEqual({ xp: 6750, nextLevelXp: 10000, xpToNextLevel: 3250 });
  });

  it('resolves observer style by priority', () => {
    expect(resolveObserverStyle(2, 20, 1)).toBe('Ранний наблюдатель');
    expect(resolveObserverStyle(6, 75, 0)).toBe('Точный прогнозист');
    expect(resolveObserverStyle(10, 40, 0)).toBe('Сигнальный разведчик');
    expect(resolveObserverStyle(3, 67, 0)).toBe('Осторожный аналитик');
    expect(resolveObserverStyle(0, 0, 0)).toBe('Новый наблюдатель');
  });

  it('normalizes an empty report into safe defaults', () => {
    const report = normalizeWrappedReport(null);
    expect(report.isEmpty).toBe(true);
    expect(report.summary.signalsThisWeek).toBe(0);
    expect(report.mainTheme.label).toBe('Пока данных мало');
    expect(report.explain.length).toBeGreaterThan(0);
  });
});
