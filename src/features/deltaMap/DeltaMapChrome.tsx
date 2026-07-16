import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeltaCategory } from '../deltas/deltaTypes';
import { defaultDeltaMapFilters, type DeltaMapFilters } from './deltaMapLogic';
import { DeltaMapFiltersView } from './DeltaMapFilters';
import { DeltaMapHeader } from './DeltaMapHeader';

type ChromeProps = { filters: DeltaMapFilters; categories: DeltaCategory[]; onChange: (filters: DeltaMapFilters) => void };
type MobileChromeProps = ChromeProps & { collapsed: boolean; onCollapsedChange: (value: boolean) => void };

export function DeltaMapLegend() {
  return <div className="delta-map-legend">
    <strong>Легенда</strong>
    <p><i className="positive" /> зелёный — стало лучше</p>
    <p><i className="negative" /> коралловый — стало хуже</p>
    <p><i className="new" /> жёлтое — новая</p>
    <p><i className="checking" /> янтарное — проверяется</p>
    <p><i className="confirmed" /> светлое — подтверждена</p>
    <p><i className="fork" /> фиолетовое двойное — развилка</p>
  </div>;
}

export function DesktopDeltaMapChrome({ loading, filters, categories, onChange }: ChromeProps & { loading: boolean }) {
  return <>
    <DeltaMapHeader loading={loading} />
    <DeltaMapFiltersView filters={filters} categories={categories} onChange={onChange} />
    <DeltaMapLegend />
  </>;
}

export function MobileDeltaMapChrome({ filters, categories, onChange, collapsed, onCollapsedChange }: MobileChromeProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const activeCount = [filters.direction, filters.status, filters.categorySlug].filter((value) => value !== 'all').length;

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => filterButtonRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      else if (!sheetRef.current.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keydown);
    };
  }, [close, open]);

  if (collapsed) {
    return <div className="delta-mobile-toolbar is-collapsed">
      <button onClick={() => onCollapsedChange(false)}>Пермь · показать панель</button>
    </div>;
  }

  return <>
    <div className="delta-mobile-toolbar">
      <strong>Пермь</strong>
      <button ref={filterButtonRef} onClick={() => { setDraft(filters); setOpen(true); }}>Фильтры · {activeCount}</button>
      <button onClick={() => onCollapsedChange(true)}>Скрыть</button>
    </div>
    {open && <div className="delta-filter-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={sheetRef} className="delta-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="delta-filter-title">
        <header>
          <h2 id="delta-filter-title">Фильтры</h2>
          <button ref={closeButtonRef} onClick={close} aria-label="Закрыть">×</button>
        </header>
        <FilterGroup title="Направление" value={draft.direction} options={[['all', 'Все'], ['positive', 'Стало лучше'], ['negative', 'Стало хуже']]} onChange={(value) => setDraft({ ...draft, direction: value as DeltaMapFilters['direction'] })} />
        <FilterGroup title="Статус" value={draft.status} options={[['all', 'Все'], ['new', 'Новые'], ['checking', 'Проверяются'], ['confirmed', 'Подтверждены'], ['fork', 'Развилки']]} onChange={(value) => setDraft({ ...draft, status: value as DeltaMapFilters['status'] })} />
        <FilterGroup title="Категория" value={draft.categorySlug} options={[['all', 'Все категории'], ...categories.map((category) => [category.slug, category.title] as [string, string])]} onChange={(value) => setDraft({ ...draft, categorySlug: value })} />
        <details><summary>Легенда</summary><DeltaMapLegend /></details>
        <footer>
          <button onClick={() => setDraft(defaultDeltaMapFilters)}>Сбросить</button>
          <button className="primary" onClick={() => { onChange(draft); close(); }}>Применить</button>
        </footer>
      </div>
    </div>}
  </>;
}

function FilterGroup({ title, value, options, onChange }: { title: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <fieldset>
    <legend>{title}</legend>
    {options.map(([key, label]) => <label key={key}>
      <input type="radio" name={title} value={key} checked={value === key} onChange={() => onChange(key)} />
      <span>{label}</span>
    </label>)}
  </fieldset>;
}
