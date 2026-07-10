import type { DeltaEffect, DeltaImpactLevel, DeltaStatus } from './deltaTypes';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function deriveDeltaStatus(confirmCount: number, disconfirmCount: number, confirmationTarget: number, moderationState: 'visible' | 'hidden' | 'merged' = 'visible', expiresAt?: Date | string, now: Date = new Date()): DeltaStatus {
  if (moderationState === 'hidden' || moderationState === 'merged' || (expiresAt && isDeltaExpired(expiresAt, now))) return 'archived';
  if (confirmCount > 0 && disconfirmCount > 0) return 'fork';
  if (confirmCount >= confirmationTarget) return 'confirmed';
  if (confirmCount >= 2) return 'checking';
  return 'new';
}

export function calculateConfirmationTarget(sensitivityWeight: number, distanceFromCenterM: number, outskirtsDistanceM = 8000): number {
  let target = 3;
  if (sensitivityWeight >= 0.85) target += 1;
  if (distanceFromCenterM >= outskirtsDistanceM) target -= 1;
  return clamp(target, 3, 4);
}

export function calculateDeltaPriority(sensitivityWeight: number, impactLevel: DeltaImpactLevel, createdAt: Date | string, distanceFromCenterM: number, outskirtsDistanceM = 8000, now: Date = new Date()): number {
  const impact = impactLevel === 'critical' ? 0.35 : impactLevel === 'strong' ? 0.20 : 0;
  const ageHours = (now.getTime() - new Date(createdAt).getTime()) / 36e5;
  const freshness = ageHours < 24 ? 0.10 : ageHours <= 72 ? 0.05 : 0;
  const outskirts = distanceFromCenterM >= outskirtsDistanceM ? 0.05 : 0;
  return Number(clamp(sensitivityWeight * 0.5 + impact + freshness + outskirts, 0, 1).toFixed(3));
}

export function getDeltaProgressText(confirmCount: number, confirmationTarget: number): string {
  const remaining = Math.max(confirmationTarget - confirmCount, 0);
  return remaining === 0 ? 'Порог подтверждений достигнут.' : `Нужно ещё подтверждений: ${remaining}.`;
}

export function getDeltaEffectCopy(reaction: 'confirm' | 'disconfirm' | 'created', previousStatus: DeltaStatus | null, newStatus: DeltaStatus): DeltaEffect {
  if (reaction === 'created') return { type: 'created', previousStatus, newStatus, message: 'Дельта опубликована', detail: 'Сейчас вы первый наблюдатель. Нужны ещё независимые подтверждения.' };
  if (reaction === 'disconfirm' || newStatus === 'fork') return { type: 'reaction', previousStatus, newStatus, message: 'Вы создали развилку', detail: 'Рядом ситуацию видят по-разному.' };
  if (newStatus === 'confirmed') return { type: 'reaction', previousStatus, newStatus, message: 'Дельта подтвердилась', detail: 'Достигнут порог независимых подтверждений.' };
  if (newStatus === 'checking' && previousStatus !== 'checking') return { type: 'reaction', previousStatus, newStatus, message: 'Ваш отклик усилил дельту', detail: 'Она перешла в стадию проверки.' };
  return { type: 'reaction', previousStatus, newStatus, message: 'Ваш отклик усилил дельту', detail: 'Подтверждение учтено.' };
}

export function isDeltaExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}
