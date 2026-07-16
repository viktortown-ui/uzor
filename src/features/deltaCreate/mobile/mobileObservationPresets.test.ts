import { describe, expect, it } from 'vitest';
import { DELTA_CREATE_CATEGORIES } from '../deltaCreateTypes';
import { createEmptyDeltaDraft } from '../deltaCreateLogic';
import { MOBILE_OBSERVATION_PRESETS, presetDraftPatch } from './mobileObservationPresets';

describe('mobile observation presets', () => {
  it('has stable unique ids and valid complete mappings', () => {
    expect(new Set(MOBILE_OBSERVATION_PRESETS.map((item) => item.id)).size).toBe(MOBILE_OBSERVATION_PRESETS.length);
    for (const item of MOBILE_OBSERVATION_PRESETS) {
      expect(DELTA_CREATE_CATEGORIES.some((category) => category.slug === item.categorySlug)).toBe(true);
      expect(item.title.trim().length).toBeGreaterThanOrEqual(3);
      expect(item.title.length).toBeLessThanOrEqual(48);
      expect(item.observedWindow).toBe('today');
      expect(item.impactLevel).toBe('noticeable');
      expect(item.direction === 'positive' ? ['faster', 'cheaper', 'more_available', 'more', 'appeared', 'improved', 'other'] : ['slower', 'more_expensive', 'less_available', 'less', 'disappeared', 'worsened', 'other']).toContain(item.changeType);
    }
  });

  it('applies canonical human title to every required quick-flow field', () => {
    for (const item of MOBILE_OBSERVATION_PRESETS) {
      const draft = { ...createEmptyDeltaDraft(), ...presetDraftPatch(item) };
      expect(draft.subject).toBe(item.title);
      expect(draft.statement).toBe(draft.subject);
      expect(draft.statementMode).toBe('manual');
      expect(draft.categorySlug && draft.direction && draft.changeType && draft.observedWindow && draft.impactLevel).toBeTruthy();
      expect(draft.statement).not.toMatch(/(стало хуже|стало лучше)\s+(стало хуже|стало лучше)$/i);
    }
  });
});
