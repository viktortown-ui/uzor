import type { ForecastEventStatus } from './types';

export interface TransitionValidationResult {
  valid: boolean;
  error?: { code: 'INVALID_STATUS_TRANSITION'; from: ForecastEventStatus; to: ForecastEventStatus; message: string };
}

const normalTransitions: Record<ForecastEventStatus, ForecastEventStatus[]> = {
  draft: ['open'],
  open: ['closed'],
  closed: ['awaiting-outcome'],
  'awaiting-outcome': ['resolved'],
  resolved: [],
  cancelled: [],
};

export function validateStatusTransition(
  from: ForecastEventStatus,
  to: ForecastEventStatus,
  options: { explicitCancellation?: boolean } = {},
): TransitionValidationResult {
  const canCancel = to === 'cancelled'
    && !['resolved', 'cancelled'].includes(from)
    && options.explicitCancellation === true;
  if (normalTransitions[from].includes(to) || canCancel) return { valid: true };
  return {
    valid: false,
    error: { code: 'INVALID_STATUS_TRANSITION', from, to, message: `Transition from ${from} to ${to} is not allowed.` },
  };
}

export function statusAfterDeadline(status: ForecastEventStatus, now: string, closesAt: string): ForecastEventStatus {
  return status === 'open' && new Date(now).getTime() > new Date(closesAt).getTime() ? 'closed' : status;
}
