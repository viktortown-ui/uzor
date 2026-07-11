import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductShell } from '../../app/ProductShell';
import { isWithinPermMvpArea } from './deltaGeoLogic';
import { shareDeltaPayload } from './deltaCreateProductionLogic';

function ShellAt({ route }: { route: string }) {
  return <MemoryRouter initialEntries={[route]}><ProductShell><h1>Page</h1></ProductShell></MemoryRouter>;
}

afterEach(() => cleanup());

describe('Delta production shell safeguards', () => {
  it('shows shared navigation on /contribute with brand and active item', () => {
    render(<ShellAt route="/contribute" />);
    expect(screen.getAllByText('УЗОР')[0].closest('a')).toHaveAttribute('href', '/wrapped');
    expect(screen.getAllByText('Wrapped').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Карта дельт').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Добавить Дельту').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Добавить Дельту')[0].closest('a')).toHaveAttribute('aria-current', 'page');
  });
  it('marks map and wrapped active routes from useLocation', () => {
    render(<ShellAt route="/map" />);
    expect(screen.getAllByText('Карта дельт').find((el) => el.closest('a')?.getAttribute('aria-current') === 'page')).toBeTruthy();
    cleanup();
    render(<ShellAt route="/wrapped" />);
    expect(screen.getAllByText('Wrapped').find((el) => el.closest('a')?.getAttribute('aria-current') === 'page')).toBeTruthy();
  });
  it('keeps mobile navigation labels available', () => {
    render(<ShellAt route="/contribute" />);
    expect(screen.getAllByLabelText('Основная навигация на мобильном').length).toBeGreaterThan(0);
  });
  it('accepts Perm points and rejects outside-Perm points', () => {
    expect(isWithinPermMvpArea(58.0105, 56.2502)).toBe(true);
    expect(isWithinPermMvpArea(55.7558, 37.6173)).toBe(false);
  });
  it('falls back from non-abort native share errors to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const nav = { share: vi.fn().mockRejectedValue(new Error('nope')), clipboard: { writeText } } as unknown as Navigator;
    await expect(shareDeltaPayload({ title: 't', text: 'x', url: 'https://u.test' }, nav)).resolves.toBe('Ссылка на Дельту скопирована');
    expect(writeText).toHaveBeenCalledOnce();
  });
});
