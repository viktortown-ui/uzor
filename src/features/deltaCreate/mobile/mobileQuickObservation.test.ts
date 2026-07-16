import { describe, expect, it } from 'vitest';
import { createEmptyDeltaDraft } from '../deltaCreateLogic';
import {
  canPublishMobileSeparate,
  MOBILE_TITLE_MAX_LENGTH,
  MOBILE_TITLE_MIN_LENGTH,
  validateMobileQuickObservation,
  validateMobileTitle,
} from './mobileQuickObservation';

const validDraft = () => ({
  ...createEmptyDeltaDraft(),
  categorySlug: 'transport' as const,
  direction: 'negative' as const,
  changeType: 'other' as const,
  subject: 'Очередь стала длиннее',
  statement: 'Очередь стала длиннее',
  statementMode: 'manual' as const,
  observedWindow: 'today' as const,
  impactLevel: 'noticeable' as const,
  lat: 58.01,
  lng: 56.25,
  locationLabel: 'Выбранная точка в Перми',
  locationSource: 'map' as const,
});

describe('mobile quick observation validation', () => {
  it('uses the server-compatible 8–48 character title range', () => {
    expect(MOBILE_TITLE_MIN_LENGTH).toBe(8);
    expect(MOBILE_TITLE_MAX_LENGTH).toBe(48);
    expect(validateMobileTitle('1234567')).toBe('Минимум 8 символов');
    expect(validateMobileTitle('12345678')).toBeNull();
    expect(validateMobileTitle('x'.repeat(49))).toBe('Максимум 48 символов');
  });

  it('uses one validation result for stage and mobile publication', () => {
    const draft = validDraft();
    expect(validateMobileQuickObservation(draft)).toEqual([]);
    expect(canPublishMobileSeparate(draft)).toBe(true);
    draft.subject = 'коротко';
    draft.statement = 'коротко';
    expect(validateMobileQuickObservation(draft)).toContain('Минимум 8 символов');
    expect(canPublishMobileSeparate(draft)).toBe(false);
  });
});
