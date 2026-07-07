export type LabV4Step = 'now' | 'future' | 'why';
export type LabV4Scenario = 'early' | 'signal' | 'fork';
export type LabV4Copy = 'a' | 'b' | 'c';
export type LabV4Choice = 'Продукты' | 'Транспорт' | 'Услуги' | 'Пока не знаю';

export type FlowPath = {
  source: string;
  change: string;
  consequence: string;
  participants: number;
  contexts: number;
  note: string;
};

export type LabV4Data = {
  scenario: LabV4Scenario;
  scale: number;
  mainPath: FlowPath;
  forkPath?: FlowPath;
  secondary: Array<Pick<FlowPath, 'source' | 'change' | 'consequence'>>;
  heroTitle: string;
  heroBody: string;
  expectationLine: string;
  future: {
    subject: string;
    horizons: Record<string, { grow: number; stable: number; relief: number; note?: string }>;
  };
  statusText: string;
  trustFacts: string[];
  returnEvents: string[];
};
