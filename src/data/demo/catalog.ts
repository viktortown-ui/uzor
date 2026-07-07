import type { CatalogItem, ContributionInput } from '../../types/domain';
export const catalog: CatalogItem[] = [
...['Дольше ждать транспорт','Больше пробок','Сложнее пересаживаться','Поездки стали дороже','Сложнее попасть к важным услугам'].map((label,i)=>({id:`t${i}`,kind:'signal' as const,layer:'tension' as const,label,sortOrder:i})),
...['Появился удобный маршрут','Стало быстрее добираться','Стало проще пересаживаться','Путь стал безопаснее','Услуги стали ближе'].map((label,i)=>({id:`s${i}`,kind:'signal' as const,layer:'support' as const,label,sortOrder:i})),
...['Нужен прямой маршрут','Нужна безопасная остановка','Нужна удобная пересадка','Важные услуги должны быть ближе','Можно улучшить освещение и путь пешком'].map((label,i)=>({id:`p${i}`,kind:'signal' as const,layer:'potential' as const,label,sortOrder:i})),
...['Работающие','Родители','Пожилые','Студенты','Предприниматели','Жители района'].map((label,i)=>({id:`g${i}`,kind:'group' as const,layer:null,label,sortOrder:i})),
...['Больше времени в дороге','Опоздания','Меньше времени дома','Усталость','Больше расходов','Сложнее попасть к услугам','Легче добираться','Больше доступности','Меньше ожидания','Больше безопасности'].map((label,i)=>({id:`c${i}`,kind:'consequence' as const,layer:null,label,sortOrder:i}))
];
const now = new Date().toISOString();
export const demoContributions: ContributionInput[] = [
 {id:'1',userId:'u1',layer:'tension',signalId:'t1',groupId:'g1',consequenceId:'c3',evidence:'experienced',intensity:'high',updatedAt:now},
 {id:'2',userId:'u2',layer:'tension',signalId:'t1',groupId:'g0',consequenceId:'c3',evidence:'observed',intensity:'medium',updatedAt:now},
 {id:'3',userId:'u3',layer:'support',signalId:'s2',groupId:'g5',consequenceId:'c8',evidence:'experienced',intensity:'medium',updatedAt:now},
 {id:'4',userId:'u4',layer:'potential',signalId:'p0',groupId:'g2',consequenceId:'c5',evidence:'observed',intensity:'high',updatedAt:now}
];
