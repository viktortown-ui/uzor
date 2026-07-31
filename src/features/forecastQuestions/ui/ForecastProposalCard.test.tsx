import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(cleanup);
import { ForecastProposalCard } from './ForecastProposalCard';
const proposal = { id: '10000000-0000-4000-8000-000000000001', publicTitle: 'Мост', publicSummary: 'Описание', status: 'public_review' as const, supportCount: 1, notNowCount: 0, totalVotes: 1, createdAt: '2026-01-01T00:00:00Z' };
describe('ForecastProposalCard', () => {
  it('makes preview non-interactive', () => { const onVote = vi.fn(); render(<ForecastProposalCard proposal={proposal} mode="preview" onVote={onVote} />); expect(screen.getByText('ПРЕДПРОСМОТР ПУБЛИЧНОЙ КАРТОЧКИ')).toBeInTheDocument(); expect(screen.queryByRole('button')).not.toBeInTheDocument(); expect(onVote).not.toHaveBeenCalled(); });
  it('explains that consideration is not a forecast', () => { render(<ForecastProposalCard proposal={proposal} />); expect(screen.getByText('Это выбор темы для подготовки, а не прогноз события.')).toBeInTheDocument(); expect(screen.getByText(/Голосов: 1/)).toBeInTheDocument(); });
});
