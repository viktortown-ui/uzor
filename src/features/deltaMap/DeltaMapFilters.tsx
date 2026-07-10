import type { DeltaCategory } from '../deltas/deltaTypes';
import type { DeltaMapFilters } from './deltaMapLogic';
export function DeltaMapFiltersView({ filters, categories, onChange }: { filters: DeltaMapFilters; categories: DeltaCategory[]; onChange: (f: DeltaMapFilters) => void }) {
 return <div className="delta-map-filters" aria-label="Фильтры карты дельт">
  <label>Направление<select value={filters.direction} onChange={(e)=>onChange({...filters,direction:e.target.value as DeltaMapFilters['direction']})}><option value="all">Все</option><option value="positive">Стало лучше</option><option value="negative">Стало хуже</option></select></label>
  <label>Статус<select value={filters.status} onChange={(e)=>onChange({...filters,status:e.target.value as DeltaMapFilters['status']})}><option value="all">Все статусы</option><option value="new">Новые</option><option value="checking">Проверяются</option><option value="confirmed">Подтверждены</option><option value="fork">Развилки</option></select></label>
  <label>Категория<select value={filters.categorySlug} onChange={(e)=>onChange({...filters,categorySlug:e.target.value})}><option value="all">Все категории</option>{categories.map(c=><option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label>
 </div>;
}
