import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  pwaState: 'waiting',
  install: vi.fn(),
  openInstructions: vi.fn(),
}));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u', email: 'user@example.test' }, authenticationState: 'authenticated', accessState: 'ready', membership: { role: 'participant' }, signOut: mocks.signOut }) }));
vi.mock('../pwa/usePwaInstallSurface', () => ({ usePwaInstallSurface: () => ({ state: mocks.pwaState, canInstall: mocks.pwaState === 'eligible', install: mocks.install, openInstructions: mocks.openInstructions }) }));
vi.mock('../guide/ProductGuide', () => ({ ProductGuide: () => null }));
vi.mock('../../app/useMediaQuery', () => ({ useMediaQuery: () => false }));
import { formatApplicationVersion, SettingsPage } from './SettingsPage';

const renderPage = () => render(<MemoryRouter><SettingsPage /></MemoryRouter>);
afterEach(cleanup);
beforeEach(() => { mocks.pwaState = 'waiting'; mocks.signOut.mockReset(); mocks.install.mockReset(); mocks.openInstructions.mockReset(); });

describe('Settings account and application states', () => {
  it('shows a recoverable sign-out failure', async () => {
    mocks.signOut.mockRejectedValue(new Error('network'));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось выйти');
  });

  it('does not present 0.0.0 as a public release', () => {
    expect(formatApplicationVersion('0.0.0', 'abc1234')).toBe('Версия пока не назначена · сборка abc1234');
    expect(formatApplicationVersion('1.2.3', 'abc1234')).toBe('Версия 1.2.3 · сборка abc1234');
  });

  it.each([
    ['prompting', 'Ожидаем ответ браузера…'],
    ['pending', 'Установка завершается…'],
  ])('shows %s as a non-actionable PWA state', (state, label) => {
    mocks.pwaState = state;
    renderPage();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Установить приложение|Как установить приложение/ })).not.toBeInTheDocument();
  });
});
