import type { LabConnection, LabCopy, LabScale, LabScenario, LabView, LabZone } from './labTypes';

export const demoBadge = 'ДЕМО-ЛАБОРАТОРИЯ · синтетические данные для проверки визуала';
export const views: { id: LabView; label: string }[] = [
  { id: 'summary', label: 'Сводка' },
  { id: 'outlook', label: 'Ожидания' },
  { id: 'connections', label: 'Связи' },
];
export const scales: LabScale[] = [18, 126, 1248];
export const scenarios: { id: LabScenario; label: string }[] = [
  { id: 'shift', label: 'Общий сдвиг' },
  { id: 'split', label: 'Расхождение' },
  { id: 'relief', label: 'Улучшение' },
];
export const copyOptions: Record<LabCopy, string> = {
  a: 'Что меняется в жизни людей вокруг?',
  b: 'Это только у меня так — или уже общий сдвиг?',
  c: 'Замечай перемены раньше, чем они станут очевидными.',
};
export const scaleStatus: Record<LabScale, { title: string; body: string; fog: number; contexts: number }> = {
  18: { title: 'РАННИЙ СИГНАЛ', body: 'В круге пока мало независимых откликов. Это повод наблюдать, но не делать вывод.', fog: .72, contexts: 2 },
  126: { title: 'КАРТИНА СОБИРАЕТСЯ', body: 'Несколько сдвигов повторяются в разных жизненных контекстах.', fog: .42, contexts: 4 },
  1248: { title: 'УСТОЙЧИВЫЙ СИГНАЛ КРУГА', body: 'Это не статистика города. Но внутри данного круга сдвиг повторяется достаточно часто, чтобы его внимательно отслеживать.', fog: .18, contexts: 7 },
};
export const scenarioSummary: Record<LabScenario, { title: string; body: string; tone: string }> = {
  shift: { title: 'ДАВЛЕНИЕ УСИЛИВАЕТСЯ ↑', body: 'В круге всё чаще повторяются признаки, что повседневные расходы и доступность услуг стали тяжелее.', tone: 'pressure' },
  split: { title: 'КАРТИНА РАСХОДИТСЯ ↔', body: 'Люди замечают разные изменения. Единого направления пока нет.', tone: 'split' },
  relief: { title: 'СТАЛО ЛЕГЧЕ ↓', body: 'В круге стало больше сигналов, что часть повседневных задач решается проще.', tone: 'relief' },
};
const baseZones: LabZone[] = [
  { id: 'food', title: 'Продукты и быт', direction: 'up', coverage: { 18: 8, 126: 58, 1248: 531 }, cause: 'с расходами и свободными деньгами', spread: 'семьи чаще видят этот сдвиг первыми', outlook: { up: 58, flat: 27, down: 15, previousUp: 49 } },
  { id: 'transport', title: 'Транспорт и доступность', direction: 'up', coverage: { 18: 11, 126: 79, 1248: 436 }, cause: 'с потерей времени и усталостью', spread: 'работающие чаще связывают это с дорогой', outlook: { up: 46, flat: 34, down: 20, previousUp: 31 } },
  { id: 'services', title: 'Услуги и обязательные платежи', direction: 'flat', coverage: { 18: 5, 126: 41, 1248: 288 }, cause: 'с доступностью и спокойствием', spread: 'часть участников видит стабильность', outlook: { up: 39, flat: 43, down: 18, previousUp: 35 } },
];
export function zonesFor(scenario: LabScenario): LabZone[] {
  if (scenario === 'relief') return baseZones.map((z, i) => ({ ...z, direction: i === 1 ? 'flat' : 'down', outlook: { up: Math.max(18, z.outlook.up - 24), flat: z.outlook.flat + 6, down: z.outlook.down + 18, previousUp: Math.max(12, z.outlook.previousUp - 18) } }));
  if (scenario === 'split') return baseZones.map((z, i) => ({ ...z, direction: i === 0 ? 'split' : i === 1 ? 'up' : 'down', spread: i === 0 ? 'согласие по бюджету, но разные ощущения последствий' : z.spread }));
  return baseZones;
}
export const connections: LabConnection[] = [
  { from: 'Транспорт', through: 'Время', to: 'Усталость', strength: { 18: 7, 126: 79, 1248: 436 }, scenario: 'all' },
  { from: 'Продукты', through: 'Расходы', to: 'Свободные деньги', strength: { 18: 5, 126: 58, 1248: 531 }, scenario: 'all' },
  { from: 'Услуги', through: 'Доступность', to: 'Спокойствие', strength: { 18: 3, 126: 41, 1248: 288 }, scenario: 'all' },
  { from: 'Продукты', through: 'Расходы', to: 'Тревожность', strength: { 18: 4, 126: 36, 1248: 302 }, scenario: 'split' },
  { from: 'Транспорт', through: 'Доступность', to: 'Свободные дела', strength: { 18: 2, 126: 24, 1248: 167 }, scenario: 'relief' },
  { from: 'Услуги', through: 'Время', to: 'Спокойствие', strength: { 18: 2, 126: 22, 1248: 143 }, scenario: 'shift' },
];
export function visibleConnections(scale: LabScale, scenario: LabScenario) {
  const limit = scale === 18 ? 3 : scale === 126 ? 6 : 8;
  return connections.filter((c) => c.scenario === 'all' || c.scenario === scenario).slice(0, limit);
}
