import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyProposal, ProposalStatus } from '../api/forecastQuestionApiTypes';
const api = vi.hoisted(() => ({ getMyProposals: vi.fn() }));
vi.mock('../../../app/appMode', () => ({ isProductionConfigured: true }));
vi.mock('../api/forecastQuestionApi', () => api);
import { ForecastProposalMinePage } from './ForecastProposalMinePage';
const labels: Record<ProposalStatus, string> = { submitted: 'Получено редакцией', in_review: 'Редактор изучает', needs_clarification: 'Нужно уточнение', public_review: 'Открыто для общественного рассмотрения', selected: 'Выбрано для подготовки', converted: 'Создан экспериментальный проверяемый вопрос', rejected: 'Не принято', archived: 'Архивировано' };
const proposal = (status: ProposalStatus, index: number): MyProposal => ({ id: `10000000-0000-4000-8000-00000000000${index}`, rawQuestion: `Исходный вопрос ${index}`, publicTitle: `Заголовок ${index}`, publicDecisionNote: `Решение ${index}`, status, createdAt: '2026-08-01T07:00:00Z', updatedAt: '2026-08-02T07:00:00Z', suggestedDeadline: '2026-09-01T07:00:00Z', suggestedOptions: ['Да', 'Нет'] });
const renderPage = () => render(<MemoryRouter><ForecastProposalMinePage /></MemoryRouter>);
beforeEach(() => Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('ForecastProposalMinePage production states', () => {
  it('shows loading and empty states', async () => { let resolve!: (value: MyProposal[]) => void; api.getMyProposals.mockReturnValue(new Promise(done => { resolve = done; })); renderPage(); expect(screen.getByText('Загружаем предложения…')).toBeInTheDocument(); resolve([]); expect(await screen.findByText('Вы ещё не предлагали вопросы.')).toBeInTheDocument(); });
  it('shows a safe error and retries', async () => { api.getMyProposals.mockRejectedValueOnce(new Error()).mockResolvedValueOnce([]); renderPage(); expect(await screen.findByText('Не удалось загрузить ваши предложения.')).toBeInTheDocument(); await userEvent.click(screen.getByRole('button', { name: 'Повторить' })); expect(await screen.findByText('Вы ещё не предлагали вопросы.')).toBeInTheDocument(); });
  it('renders every status and author/editor context', async () => { api.getMyProposals.mockResolvedValue(Object.keys(labels).map((status, index) => proposal(status as ProposalStatus, index + 1))); renderPage(); for (const label of Object.values(labels)) expect(await screen.findByText(label)).toBeInTheDocument(); expect(screen.getByText('Исходный вопрос 1')).toBeInTheDocument(); expect(screen.getAllByText(/Редакционный заголовок:/)).toHaveLength(8); expect(screen.getByText('Решение 1')).toBeInTheDocument(); expect(screen.getAllByText(/Предложенный срок:/).length).toBeGreaterThan(0); expect(screen.getAllByText(/Предложенные варианты: Да · Нет/).length).toBeGreaterThan(0); expect(screen.getByText('Возможность ответить на уточнение появится позже.')).toBeInTheDocument(); });
});
