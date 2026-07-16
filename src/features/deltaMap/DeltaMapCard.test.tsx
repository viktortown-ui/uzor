import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeltaCard } from '../deltas/deltaTypes';
import { DesktopDeltaMapCard, MobileDeltaMapCard } from './DeltaMapCard';

const card: DeltaCard = { id: '1', category: { slug: 'services', title: 'Доступность услуг', iconKey: 'services' }, direction: 'positive', subject: 'Очередь стала короче', changeType: 'faster', statement: 'Очередь стала короче стало лучше', details: 'Наблюдение', observedWindow: 'last_week', impactLevel: 'noticeable', status: 'checking', moderationState: 'visible', confirmCount: 2, disconfirmCount: 0, confirmationTarget: 3, location: { lat: 58, lng: 56, label: 'Выбранная точка в Перми' }, priorityScore: 1, createdAt: '2026-01-01', lastActivityAt: '2026-01-01', expiresAt: '2027-01-01' };
const common = { onClose: vi.fn(), onRetry: vi.fn(), onReact: vi.fn() };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Delta map cards', () => {
  it('uses subject as heading and labels secondary text', () => {
    render(<DesktopDeltaMapCard card={card} {...common} />);
    expect(screen.getByRole('heading', { level: 2, name: card.subject })).toBeInTheDocument();
    expect(screen.getByText('Формулировка')).toBeInTheDocument();
    expect(screen.getByText('Комментарий автора')).toBeInTheDocument();
  });
  it('mobile card expands and collapses', async () => {
    render(<MobileDeltaMapCard card={card} {...common} />);
    expect(screen.queryByText('Формулировка')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Подробнее' }));
    expect(screen.getByText('Формулировка')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Свернуть' }));
    expect(screen.queryByText('Формулировка')).not.toBeInTheDocument();
  });
  it('falls back to statement only for blank subject', () => {
    render(<DesktopDeltaMapCard card={{ ...card, subject: ' ' }} {...common} />);
    expect(screen.getByRole('heading', { level: 2, name: card.statement })).toBeInTheDocument();
  });
  it('renders a loaded card after a successful retry', async () => {
    function RetryHarness() {
      const [loaded, setLoaded] = useState<DeltaCard | null>(null);
      const [error, setError] = useState('Не удалось открыть Дельту');
      return <DesktopDeltaMapCard card={loaded} error={error} {...common} onRetry={() => { setError(''); setLoaded(card); }} />;
    }
    render(<RetryHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(screen.getByRole('heading', { level: 2, name: card.subject })).toBeInTheDocument();
    expect(screen.queryByText('Не удалось открыть Дельту')).not.toBeInTheDocument();
  });
  it.each([DesktopDeltaMapCard, MobileDeltaMapCard])('shows loading and failure states without reactions', async (Component) => {
    const view = render(<Component card={null} loading {...common} />);
    expect(screen.getByText('Загружаем Дельту…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Подтверждаю' })).not.toBeInTheDocument();
    view.rerender(<Component card={null} error="Не удалось открыть Дельту" {...common} />);
    expect(screen.getByText('Не удалось открыть Дельту')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(common.onRetry).toHaveBeenCalled();
  });
});
