export type DeltaDirection = 'positive' | 'negative';
export type DeltaChangeType = 'faster' | 'slower' | 'cheaper' | 'more_expensive' | 'more_available' | 'less_available' | 'more' | 'less' | 'appeared' | 'disappeared' | 'improved' | 'worsened' | 'other';
export type DeltaObservedWindow = 'today' | 'last_3_days' | 'last_week' | 'last_2_4_weeks';
export type DeltaImpactLevel = 'noticeable' | 'strong' | 'critical';
export type DeltaStatus = 'new' | 'checking' | 'confirmed' | 'fork' | 'archived';
export type DeltaModerationState = 'visible' | 'hidden' | 'merged';
export type DeltaReaction = 'confirm' | 'disconfirm';

export interface DeltaCategory { id?: string; slug: string; title: string; description?: string | null; iconKey: string; sensitivityWeight?: number; sortOrder?: number; }
export interface DeltaCity { id?: string; slug: string; name: string; centerLat: number; centerLng: number; defaultZoom: number; outskirtsDistanceM: number; }
export interface DeltaLocation { lat: number; lng: number; label: string; precision?: 'point' | 'district' | 'city'; }
export interface DeltaProgress { current: number; target: number; }
export interface DeltaEffect { type: 'created' | 'reaction' | 'status' | 'error'; previousStatus: DeltaStatus | null; newStatus: DeltaStatus | null; message: string; detail: string; }
export interface DeltaCard { id: string; category: DeltaCategory; direction: DeltaDirection; subject: string; changeType: DeltaChangeType; statement: string; details?: string | null; observedWindow: DeltaObservedWindow; impactLevel: DeltaImpactLevel; status: DeltaStatus; moderationState: DeltaModerationState; confirmCount: number; disconfirmCount: number; confirmationTarget: number; viewerReaction?: DeltaReaction | null; location: DeltaLocation; priorityScore: number; createdAt: string; lastActivityAt: string; expiresAt: string; }
export interface DeltaMapItem { id: string; category: DeltaCategory; direction: DeltaDirection; statement: string; status: DeltaStatus; confirmCount: number; disconfirmCount: number; confirmationTarget: number; priorityScore: number; location: DeltaLocation; lastActivityAt: string; }
export interface CreateDeltaInput { circleId: string; citySlug: string; categorySlug: string; direction: DeltaDirection; subject: string; changeType: DeltaChangeType; statement: string; details?: string | null; observedWindow: DeltaObservedWindow; impactLevel: DeltaImpactLevel; lat: number; lng: number; locationLabel: string; locationPrecision?: DeltaLocation['precision']; }
export interface ReactToDeltaResult { delta: Pick<DeltaCard, 'id' | 'status' | 'confirmationTarget' | 'confirmCount' | 'disconfirmCount'> & { progress: DeltaProgress }; effect: DeltaEffect; }
export interface FindSimilarDeltaInput { circleId: string; citySlug: string; categorySlug: string; direction: DeltaDirection; changeType: DeltaChangeType; lat: number; lng: number; radiusM?: number; days?: number; }
export interface DeltaViewportInput { circleId: string; citySlug: string; minLat: number; minLng: number; maxLat: number; maxLng: number; direction?: DeltaDirection | null; categorySlug?: string | null; status?: DeltaStatus | null; }
export type DeltaApiErrorCode = 'not_authenticated' | 'not_circle_member' | 'city_not_found' | 'category_not_found' | 'invalid_coordinates' | 'invalid_delta_payload' | 'delta_not_found' | 'author_reaction_locked' | 'unknown';
