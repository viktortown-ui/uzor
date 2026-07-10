import type { DeltaCard, DeltaMapItem } from '../deltas/deltaTypes';
import { fallbackCategories } from './deltaMapLogic';
const now = new Date();
const iso = (h: number) => new Date(now.getTime() - h * 36e5).toISOString();
const cat = (slug: string) => fallbackCategories.find((c) => c.slug === slug)!;
export const demoDeltaMapData: DeltaMapItem[] = [
 { id:'demo-1', category:cat('transport'), direction:'negative', statement:'Стало дольше ждать транспорт вечером.', status:'new', confirmCount:1, disconfirmCount:0, confirmationTarget:3, priorityScore:.55, location:{lat:58.0105,lng:56.2502,label:'Центр'}, lastActivityAt:iso(2)},
 { id:'demo-2', category:cat('transport'), direction:'positive', statement:'На одном участке стало меньше пробок утром.', status:'checking', confirmCount:2, disconfirmCount:0, confirmationTarget:3, priorityScore:.62, location:{lat:58.021,lng:56.285,label:'Разгуляй'}, lastActivityAt:iso(20)},
 { id:'demo-3', category:cat('services'), direction:'positive', statement:'Получить бытовую услугу стало быстрее.', status:'confirmed', confirmCount:4, disconfirmCount:0, confirmationTarget:3, priorityScore:.72, location:{lat:57.997,lng:56.232,label:'Комсомольский проспект'}, lastActivityAt:iso(30)},
 { id:'demo-4', category:cat('services'), direction:'negative', statement:'Очередь в районе стала заметно длиннее.', status:'checking', confirmCount:2, disconfirmCount:0, confirmationTarget:3, priorityScore:.5, location:{lat:58.053,lng:56.314,label:'Садовый'}, lastActivityAt:iso(5)},
 { id:'demo-5', category:cat('urban-environment'), direction:'positive', statement:'После ремонта проход стал удобнее.', status:'confirmed', confirmCount:6, disconfirmCount:0, confirmationTarget:3, priorityScore:.8, location:{lat:57.982,lng:56.261,label:'Балатово'}, lastActivityAt:iso(70)},
 { id:'demo-6', category:cat('urban-environment'), direction:'positive', statement:'Освещение возле остановки стало лучше.', status:'new', confirmCount:1, disconfirmCount:0, confirmationTarget:3, priorityScore:.44, location:{lat:58.035,lng:56.19,label:'Мотовилиха'}, lastActivityAt:iso(1)},
 { id:'demo-7', category:cat('transport'), direction:'negative', statement:'Дорога стала занимать больше времени.', status:'confirmed', confirmCount:5, disconfirmCount:0, confirmationTarget:4, priorityScore:.74, location:{lat:57.955,lng:56.11,label:'Закамск'}, lastActivityAt:iso(50)},
 { id:'demo-8', category:cat('services'), direction:'negative', statement:'По доступности услуги мнения разошлись.', status:'fork', confirmCount:3, disconfirmCount:2, confirmationTarget:3, priorityScore:.69, location:{lat:58.08,lng:56.36,label:'Гайва'}, lastActivityAt:iso(6)},
];
export function demoCard(id: string): DeltaCard | null { const item = demoDeltaMapData.find((d) => d.id === id); if (!item) return null; return { ...item, subject:item.statement, changeType:'other', details:'Демо-карточка показывает безопасные публичные поля без авторов и технических данных.', observedWindow:'last_week', impactLevel:item.direction === 'positive' ? 'strong':'noticeable', moderationState:'visible', viewerReaction:null, createdAt:iso(72), expiresAt:iso(-720) }; }
