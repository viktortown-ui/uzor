import { describe, expect, it, vi } from 'vitest';
import { ForecastQuestionApiError, forecastQuestionValidation, submitProposal } from './forecastQuestionApi';
const rpc = vi.fn();
vi.mock('../../../lib/supabase/client', () => ({ getSupabaseClient: () => ({ rpc }) }));
const id = '10000000-0000-4000-8000-000000000001';
const base = { id, rawQuestion: 'Откроют ли мост вовремя?', publicTitle: null, publicSummary: null, status: 'submitted', publicDecisionNote: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', linkedDeltaId: null, suggestedDeadline: null, suggestedOptions: ['Да'] };
const publicRow = { id, publicTitle: 'Мост', publicSummary: 'Описание', locationLabel: null, linkedDeltaId: null, status: 'public_review', publicReviewStartedAt: '2026-01-01T00:00:00Z', supportCount: 1, notNowCount: 1, totalVotes: 2, viewerVote: 'support', createdAt: '2026-01-01T00:00:00Z', selectedAt: null };
const editorRow = { ...base, authorUserId: id, whyItMatters: null, locationLabel: null, suggestedSourceReference: null, reviewedAt: null, publicReviewStartedAt: null, selectedAt: null, supportCount: 0, notNowCount: 0, totalVotes: 0 };
describe('forecast question response validation', () => {
  it('parses safe private, public and editor payloads', () => { expect(forecastQuestionValidation.parseMyProposal(base).status).toBe('submitted'); expect(forecastQuestionValidation.parsePublicProposal(publicRow).viewerVote).toBe('support'); expect(forecastQuestionValidation.parseEditorProposal(editorRow).authorUserId).toBe(id); });
  it.each([
    [{ ...base, id: 'bad' }, 'UUID'], [{ ...base, status: 'bad' }, 'status'], [{ ...base, createdAt: 'bad' }, 'date'], [{ ...base, suggestedOptions: Array(7).fill('x') }, 'options'], [{ ...base, suggestedOptions: ['x'.repeat(121)] }, 'length'],
  ])('rejects malformed private payload: %s (%s)', value => { expect(() => forecastQuestionValidation.parseMyProposal(value)).toThrow(ForecastQuestionApiError); });
  it.each([
    [{ ...publicRow, viewerVote: 'yes' }, 'vote'], [{ ...publicRow, supportCount: -1 }, 'negative'], [{ ...publicRow, totalVotes: 3 }, 'inconsistent'],
  ])('rejects malformed public payload: %s (%s)', value => { expect(() => forecastQuestionValidation.parsePublicProposal(value)).toThrow(ForecastQuestionApiError); });
  it('validates a complete moderation payload', () => { expect(forecastQuestionValidation.parseEditorProposal(editorRow)).toMatchObject({ id, totalVotes: 0 }); });
  it('trusts the authoritative submission response', async () => { rpc.mockResolvedValueOnce({ data: base, error: null }); const result = await submitProposal({ citySlug: 'perm', rawQuestion: 'Другой вопрос автора?', suggestedOptions: ['Нет'] }); expect(result.rawQuestion).toBe(base.rawQuestion); expect(result.suggestedOptions).toEqual(['Да']); });
});
