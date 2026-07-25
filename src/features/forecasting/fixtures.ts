import { FORECAST_DOMAIN_VERSION, type ForecastEvent } from './types';

// DEMO DATA ONLY. These events are fictional contract examples, not verified claims.
export const demoForecastEvents: ForecastEvent[] = [
  {
    id: 'demo-water-2026-08-02', title: 'Восстановят ли подачу воды к указанному сроку?',
    shortDescription: 'Условие: муниципальная служба сообщит о полном восстановлении подачи до 18:00 2 августа 2026 года.',
    category: 'городские услуги', cityId: 'demo-city', options: [{ id: 'resolved', label: 'Да, восстановят' }, { id: 'not-resolved', label: 'Нет, не восстановят' }],
    opensAt: '2026-07-26T09:00:00Z', closesAt: '2026-08-01T18:00:00Z', resolvesAt: '2026-08-02T18:00:00Z', status: 'draft',
    resolutionSource: 'municipal-service', createdAt: '2026-07-25T12:00:00Z', version: FORECAST_DOMAIN_VERSION,
  },
  {
    id: 'demo-milk-price-2026-08-10', title: 'Будет ли демо-цена продукта выше 120 ₽?',
    shortDescription: 'Условие: цена вымышленного продукта DEMO-MILK-1L (молоко, ровно 1 л) в публичном демо-каталоге вымышленного магазина «ДемоМаркет-01» в 12:00 UTC 10 августа 2026 года будет строго больше 120,00 ₽; отсутствие цены означает вариант «не выше».',
    category: 'цены', geographicScope: 'вымышленный магазин «ДемоМаркет-01» в демо-городе', options: [{ id: 'above', label: 'Строго выше 120,00 ₽' }, { id: 'not-above', label: '120,00 ₽ или ниже либо цена отсутствует' }],
    opensAt: '2026-07-26T09:00:00Z', closesAt: '2026-08-09T12:00:00Z', resolvesAt: '2026-08-10T12:00:00Z', status: 'draft',
    resolutionSource: 'retailer-publication', createdAt: '2026-07-25T12:00:00Z', version: FORECAST_DOMAIN_VERSION,
  },
  {
    id: 'demo-festival-2026-08-15', title: 'Состоится ли городской фестиваль в объявленную дату?',
    shortDescription: 'Условие: организатор опубликует подтверждение начала фестиваля 15 августа 2026 года без переноса на другую дату.',
    category: 'городские события', cityId: 'demo-city', options: [{ id: 'held', label: 'Состоится 15 августа' }, { id: 'not-held', label: 'Не состоится или будет перенесён' }],
    opensAt: '2026-07-26T09:00:00Z', closesAt: '2026-08-14T18:00:00Z',
    resolutionWindow: { startsAt: '2026-08-15T00:00:00Z', endsAt: '2026-08-16T00:00:00Z' }, status: 'draft',
    resolutionSource: 'event-organizer', createdAt: '2026-07-25T12:00:00Z', version: FORECAST_DOMAIN_VERSION,
  },
];
