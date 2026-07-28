import { describe, expect, it } from 'vitest';
import { getDeltaDisplayTitle, getDeltaMetadata, shouldShowChangeTypeLabel, shouldShowManualStatement } from './deltaPresentation';

describe('Delta semantic presentation', () => {
  it('does not duplicate a mobile preset whose subject and statement are equal', () => {
    const delta = { subject: 'Автобус приходится ждать дольше', statement: 'Автобус приходится ждать дольше', changeType: 'slower' as const, category: { title: 'Транспорт и дорога' } };
    expect(shouldShowChangeTypeLabel(delta)).toBe(false);
    expect(getDeltaMetadata(delta)).toBe('Транспорт и дорога');
  });
  it('shows change type for a desktop subject with an automatic formulation', () => {
    expect(shouldShowChangeTypeLabel({ subject: 'Ожидание автобуса', statement: 'Ожидание автобуса — Стало медленнее.', changeType: 'slower' })).toBe(true);
  });
  it('keeps a different manual formulation and separate change type', () => {
    const delta = { subject: 'Ожидание автобуса', statement: 'По вечерам интервал вырос примерно вдвое', changeType: 'slower' as const };
    expect(shouldShowChangeTypeLabel(delta)).toBe(true);
    expect(shouldShowManualStatement(delta, true)).toBe(true);
  });
  it('falls back to statement without inventing duplicate metadata', () => {
    const delta = { subject: '', statement: 'Автобус ходит реже', changeType: 'slower' as const };
    expect(getDeltaDisplayTitle(delta)).toBe('Автобус ходит реже');
    expect(shouldShowChangeTypeLabel(delta)).toBe(false);
  });
});
