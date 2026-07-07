export type Layer = 'tension' | 'support' | 'potential';
export type Evidence = 'experienced' | 'observed';
export type Intensity = 'low' | 'medium' | 'high';
export type CatalogKind = 'signal' | 'group' | 'consequence';
export type ClarityStatus = 'fog' | 'emerging' | 'confirmed';

export interface CatalogItem { id: string; kind: CatalogKind; layer: Layer | null; label: string; sortOrder: number; }
export interface ContributionInput { id: string; userId: string; layer: Layer; signalId: string; groupId: string; consequenceId: string; evidence: Evidence; intensity: Intensity; updatedAt: string; }
export interface BranchAggregate { id: string; layer: Layer; signalId: string; groupId: string; consequenceId: string; participantCount: number; distinctGroups: number; evidenceDiversity: number; strength: number; clarity: number; status: ClarityStatus; tensionScore: number; supportScore: number; potentialScore: number; isDivergence: boolean; }
export interface ThemeSnapshot { participantCount: number; threadCount: number; branches: BranchAggregate[]; convergence: Array<{ consequenceId: string; influence: number }>; clarity: number; }
