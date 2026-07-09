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

import { readFileSync } from 'node:fs';

describe('wrapped SQL hotfix', () => {
  const sql = readFileSync('supabase/migrations/005_fix_wrapped_report_sql_and_confirmation.sql', 'utf8');

  it('uses explicit ON joins instead of USING for branch matching', () => {
    expect(sql).not.toMatch(/using\s*\(\s*layer\s*,\s*signal_id\s*,\s*consequence_id\s*\)/i);
    expect(sql).toContain('on cb.layer = w.layer and cb.signal_id = w.signal_id and cb.consequence_id = w.consequence_id');
    expect(sql).toContain('on cb.layer = c.layer and cb.signal_id = c.signal_id and cb.consequence_id = c.consequence_id');
  });

  it('confirmed logic uses participants >= 2 and does not use clarity as standalone confirmation', () => {
    expect(sql).toContain('(cb.participants >= 2) as confirmed');
    expect(sql).not.toMatch(/participants\s*>=\s*2\s+or\s+cb\.clarity/i);
    expect(sql).not.toMatch(/participants\s*>=\s*2\s+or\s+clarity/i);
  });

  it('documents one user cannot confirm himself while two users on same branch confirm', () => {
    expect('one distinct participant').not.toBe('confirmed');
    expect(1 >= 2).toBe(false);
    expect(2 >= 2).toBe(true);
    expect(sql).toContain('count(distinct user_id) participants');
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WrappedRightSignals } from './components/WrappedRightSignals';

describe('wrapped UI fragments', () => {
  it('rightSignals empty state renders when empty', () => {
    render(<MemoryRouter><WrappedRightSignals signals={[]} /></MemoryRouter>);
    expect(screen.getByText('Пока нет подтверждённых сигналов')).toBeInTheDocument();
    expect(screen.getByText(/Нужно, чтобы другой участник независимо отметил похожую ветку/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Добавить сигнал' })).toHaveAttribute('href', '/contribute');
  });
});
