import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultDeltaMapFilters } from './deltaMapLogic';
import { MobileDeltaMapChrome } from './DeltaMapChrome';

const categories = [{ slug: 'transport', title: 'Транспорт и дорога', iconKey: 'transport' }];
afterEach(cleanup);
function setup(filters = defaultDeltaMapFilters, collapsed = false) {
  const onChange = vi.fn(); const onCollapsedChange = vi.fn();
  render(<><MobileDeltaMapChrome filters={filters} categories={categories} onChange={onChange} collapsed={collapsed} onCollapsedChange={onCollapsedChange} /><button>Док</button></>);
  return { onChange, onCollapsedChange };
}

describe('MobileDeltaMapChrome', () => {
  it('keeps draft values private until Apply and reports active count', async () => {
    const { onChange } = setup({ ...defaultDeltaMapFilters, status: 'new' });
    const filterButton = screen.getByRole('button', { name: 'Фильтры · 1' });
    await userEvent.click(filterButton); await userEvent.click(screen.getByLabelText('Стало лучше'));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Применить' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ direction: 'positive', status: 'new' }));
    expect(filterButton).toHaveFocus();
  });
  it('Reset changes only the draft until Apply', async () => {
    const { onChange } = setup({ direction: 'negative', status: 'new', categorySlug: 'transport' });
    await userEvent.click(screen.getByRole('button', { name: 'Фильтры · 3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Применить' }));
    expect(onChange).toHaveBeenCalledWith(defaultDeltaMapFilters);
  });
  it('Escape and backdrop close and restore focus', async () => {
    setup(); const button = screen.getByRole('button', { name: 'Фильтры · 0' });
    await userEvent.click(button); expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); await waitFor(() => expect(button).toHaveFocus());
    await userEvent.click(button); fireEvent.mouseDown(document.querySelector('.delta-filter-backdrop')!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); await waitFor(() => expect(button).toHaveFocus());
  });
  it('traps forward and backward Tab inside the dialog', async () => {
    setup(); await userEvent.click(screen.getByRole('button', { name: 'Фильтры · 0' }));
    const close = screen.getByRole('button', { name: 'Закрыть' }); const apply = screen.getByRole('button', { name: 'Применить' });
    close.focus(); fireEvent.keyDown(document, { key: 'Tab', shiftKey: true }); expect(apply).toHaveFocus();
    apply.focus(); fireEvent.keyDown(document, { key: 'Tab' }); expect(close).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Док' })).not.toHaveFocus();
  });
  it('collapsed toolbar restores the expanded panel', async () => {
    const { onCollapsedChange } = setup(defaultDeltaMapFilters, true);
    await userEvent.click(screen.getByRole('button', { name: 'Пермь · показать панель' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });
});
