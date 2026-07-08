export type WrappedPeriod = { weekStart: string; weekEnd: string; label: string };
export type WrappedIdentity = { title: string; subtitle: string; percentileText?: string; style: string };
export type WrappedSummary = { signalsThisWeek: number; confirmedSignals: number; accuracy: number; earlySignals: number; weekStreak: number; xp: number; nextLevelXp: number; xpToNextLevel: number; trendDelta?: number; previousWeekDelta?: number };
export type WrappedTheme = { label: string; share: number; description?: string };
export type WrappedActivityPoint = { day: string; signals: number; confirmed: number; unconfirmed: number };
export type WrappedRightSignal = { title: string; consequence?: string; tag: string; status: string; time: string };
export type WrappedProgress = { currentLevel: string; previousLevel: string; nextLevel: string; nextLevelLocked: boolean };
export type WrappedReport = { period: WrappedPeriod; identity: WrappedIdentity; summary: WrappedSummary; mainTheme: WrappedTheme; topThemes: WrappedTheme[]; activity: WrappedActivityPoint[]; rightSignals: WrappedRightSignal[]; progress: WrappedProgress; explain: string[]; isEmpty?: boolean; shareText?: string };
