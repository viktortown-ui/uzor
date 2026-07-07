export type LabView = 'summary' | 'outlook' | 'connections';
export type LabScale = 18 | 126 | 1248;
export type LabScenario = 'shift' | 'split' | 'relief';
export type LabCopy = 'a' | 'b' | 'c';
export type LabZoneId = 'food' | 'transport' | 'services';
export type Direction = 'up' | 'flat' | 'down' | 'split';

export type LabZone = {
  id: LabZoneId;
  title: string;
  direction: Direction;
  cause: string;
  spread: string;
  coverage: Record<LabScale, number>;
  outlook: { up: number; flat: number; down: number; previousUp: number };
};

export type LabConnection = {
  from: string;
  through: string;
  to: string;
  strength: Record<LabScale, number>;
  scenario: LabScenario | 'all';
};
