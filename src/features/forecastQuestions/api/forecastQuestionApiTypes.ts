export const proposalStatuses = [
  'submitted', 'in_review', 'needs_clarification', 'public_review',
  'selected', 'converted', 'rejected', 'archived',
] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];
export type PublicProposalStatus = 'public_review' | 'selected';
export type ConsiderationVote = 'support' | 'not_now';
export type ModerationAction =
  | 'start_review' | 'request_clarification' | 'open_public_review'
  | 'select' | 'reject' | 'archive' | 'return_to_review';

export interface MyProposal {
  id: string; rawQuestion: string; publicTitle?: string; publicSummary?: string;
  status: ProposalStatus; publicDecisionNote?: string; createdAt: string;
  updatedAt: string; linkedDeltaId?: string; suggestedDeadline?: string;
  suggestedOptions: string[];
}
export interface PublicProposal {
  id: string; publicTitle: string; publicSummary: string; locationLabel?: string;
  linkedDeltaId?: string; status: PublicProposalStatus; publicReviewStartedAt?: string;
  supportCount: number; notNowCount: number; totalVotes: number;
  viewerVote?: ConsiderationVote; createdAt: string; selectedAt?: string;
}
export interface EditorProposal extends MyProposal {
  authorUserId: string; whyItMatters?: string; locationLabel?: string;
  suggestedSourceReference?: string; reviewedAt?: string;
  publicReviewStartedAt?: string; selectedAt?: string;
  supportCount: number; notNowCount: number; totalVotes: number;
}
export interface SubmitProposalInput {
  citySlug: string; rawQuestion: string; whyItMatters?: string;
  locationLabel?: string; linkedDeltaId?: string; suggestedOptions: string[];
  suggestedSourceReference?: string; suggestedDeadline?: string;
}
