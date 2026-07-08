import type { WrappedReport } from './wrappedTypes';

export const wrappedDemoReport: WrappedReport = {
  period: { weekStart: '2026-07-06', weekEnd: '2026-07-12', label: 'Эта неделя' },
  identity: { title: 'Ранний наблюдатель', subtitle: 'Вы замечаете сдвиги раньше круга.', percentileText: 'Вы в числе 23% самых точных', style: 'Осторожный аналитик' },
  summary: { signalsThisWeek: 23, confirmedSignals: 14, accuracy: 62, earlySignals: 1, weekStreak: 3, xp: 7678, nextLevelXp: 10000, xpToNextLevel: 2322 },
  mainTheme: { label: 'Транспорт', share: 38, description: 'Вы замечали чаще других в этой теме.' },
  topThemes: [{ label: 'Транспорт', share: 38 }, { label: 'Продукты', share: 29 }, { label: 'Услуги', share: 18 }],
  activity: [
    { day: 'Пн', signals: 2, confirmed: 1, unconfirmed: 1 }, { day: 'Вт', signals: 4, confirmed: 3, unconfirmed: 1 }, { day: 'Ср', signals: 3, confirmed: 2, unconfirmed: 1 },
    { day: 'Чт', signals: 5, confirmed: 3, unconfirmed: 2 }, { day: 'Пт', signals: 4, confirmed: 2, unconfirmed: 2 }, { day: 'Сб', signals: 3, confirmed: 2, unconfirmed: 1 }, { day: 'Вс', signals: 2, confirmed: 1, unconfirmed: 1 },
  ],
  rightSignals: [
    { title: 'Рост цен на топливо', consequence: 'Маршруты стали дороже', tag: 'Транспорт', status: 'Подтверждено', time: 'Вт 10:24' },
    { title: 'Скидки на молочные продукты', consequence: 'Люди закупались заранее', tag: 'Продукты', status: 'Подтверждено', time: 'Чт 18:06' },
    { title: 'Сбой в приложениях такси', consequence: 'Поездки переносились', tag: 'Услуги', status: 'Подтверждено', time: 'Пт 09:41' },
  ],
  progress: { currentLevel: 'Ранний наблюдатель', previousLevel: 'Сигнальный разведчик', nextLevel: 'Тренд-предвидец', nextLevelLocked: true },
  explain: ['14 ваших сигналов подтвердились другими участниками.', '1 сигнал вы заметили раньше круга.', 'Главная тема недели — транспорт.'],
};
