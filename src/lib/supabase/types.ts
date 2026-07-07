import type { ActiveTheme, CandidateProposal, CatalogItem, Evidence, Intensity, Layer, ThemeSnapshot } from '../../types/domain';

export interface JoinResult { circle_id: string; circle_name: string; circle_context: string; theme_id: string; theme_title: string; theme_subtitle: string; }
export interface ContributionPayload { themeId: string; layer: Layer; signalId: string; groupId: string; consequenceId: string; evidence: Evidence; intensity: Intensity; }
export type { ActiveTheme, CandidateProposal, CatalogItem, ThemeSnapshot };
