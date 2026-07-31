import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ submitProposal: vi.fn() }));
vi.mock('../../../app/appMode', () => ({ isProductionConfigured: true }));
vi.mock('../api/forecastQuestionApi', async importOriginal => ({ ...(await importOriginal<typeof import('../api/forecastQuestionApi')>()), submitProposal: api.submitProposal }));
import { ForecastProposalForm } from './ForecastProposalForm';
const result = { id: '10000000-0000-4000-8000-000000000001', rawQuestion: 'Серверный вопрос', status: 'submitted', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', suggestedOptions: [] };
const renderForm = () => render(<MemoryRouter><ForecastProposalForm /></MemoryRouter>);
const fillRequired = async () => { await userEvent.type(screen.getByLabelText('Что о будущем города стоит обсудить?'), 'Откроют ли мост до сентября?'); };
beforeEach(() => Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('ForecastProposalForm production submission', () => {
  it('sends Perm time and trimmed options, then displays the authoritative id', async () => { api.submitProposal.mockResolvedValue(result); renderForm(); await fillRequired(); fireEvent.change(screen.getByLabelText('Вариант 1'), { target: { value: '  Да  ' } }); fireEvent.change(screen.getByLabelText('Когда это можно будет проверить? (время Перми, UTC+05:00)'), { target: { value: '2026-08-15T12:00' } }); await userEvent.click(screen.getByRole('button', { name: 'Отправить редакции' })); await waitFor(() => expect(api.submitProposal).toHaveBeenCalledTimes(1)); expect(api.submitProposal).toHaveBeenCalledWith(expect.objectContaining({ suggestedDeadline: '2026-08-15T07:00:00.000Z', suggestedOptions: ['Да', ''] })); expect(await screen.findByText(/10000000-0000-4000-8000-000000000001/)).toBeInTheDocument(); expect(screen.queryByLabelText(/UUID/i)).not.toBeInTheDocument(); });
  it('prevents duplicate submission while pending', async () => { let resolve!: (value: typeof result) => void; api.submitProposal.mockReturnValue(new Promise(done => { resolve = done; })); renderForm(); await fillRequired(); const button = screen.getByRole('button', { name: 'Отправить редакции' }); fireEvent.click(button); fireEvent.click(button); expect(api.submitProposal).toHaveBeenCalledTimes(1); expect(screen.getByRole('button', { name: 'Отправляем…' })).toBeDisabled(); resolve(result); });
  it('limits options to six and allows removing one', async () => { renderForm(); const add = screen.getByRole('button', { name: 'Добавить вариант' }); for (let index = 0; index < 4; index += 1) await userEvent.click(add); expect(screen.getAllByLabelText(/^Вариант \d$/)).toHaveLength(6); expect(screen.queryByRole('button', { name: 'Добавить вариант' })).not.toBeInTheDocument(); await userEvent.click(screen.getByRole('button', { name: 'Удалить вариант 6' })); expect(screen.getAllByLabelText(/^Вариант \d$/)).toHaveLength(5); });
});
