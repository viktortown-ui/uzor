import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ForecastLockReason } from '../api/forecastApiTypes';
import type { UserForecast } from '../types';
import { ForecastCard, type ProductionForecastCardProps } from './ForecastCard';
import { createInteractiveDemoEvent } from './forecastUiLogic';

afterEach(cleanup);
const event={...createInteractiveDemoEvent(),status:'open' as const};
const forecast:UserForecast={id:'saved-id',eventId:event.id,selectedOptionId:'above',probability:.5,reasoning:'Серверное обоснование',createdAt:'2026-07-30T10:00:00Z',updatedAt:'2026-07-30T11:00:00Z',version:'forecast-domain-v1'};
function renderCard(lockReason:ForecastLockReason,extra:Partial<ProductionForecastCardProps>={}){const props:ProductionForecastCardProps={event,initialForecast:null,submissionPermitted:lockReason===null,locked:lockReason!==null,lockReason,authenticationRequired:lockReason==='not_authenticated',saving:false,onSubmit:vi.fn(),...extra};return render(<MemoryRouter><ForecastCard event={event} production={props}/></MemoryRouter>);}

describe('production ForecastCard lock reasons',()=>{
 it('renders only login-required workspace for not_authenticated and a router link',()=>{renderCard('not_authenticated');expect(screen.getByText('Чтобы сохранить прогноз, войдите в круг.')).toBeInTheDocument();expect(screen.getByRole('link',{name:'Войти'})).toHaveAttribute('href','/join');expect(screen.queryByText(/Срок приёма прогнозов завершён/)).not.toBeInTheDocument();expect(screen.queryByRole('form')).not.toBeInTheDocument();});
 it('renders before_open without deadline copy',()=>{renderCard('before_open');expect(screen.getByText('Приём прогнозов ещё не начался.')).toBeInTheDocument();expect(screen.queryByText(/Срок приёма прогнозов завершён/)).not.toBeInTheDocument();});
 it('renders deadline_passed and a saved forecast read-only',()=>{renderCard('deadline_passed',{initialForecast:forecast});expect(screen.getByText('Срок приёма прогнозов завершён.')).toBeInTheDocument();expect(screen.getByRole('radio',{name:'Строго выше 120,00 ₽'})).toBeDisabled();expect(screen.queryByRole('button',{name:/прогноз/i})).not.toBeInTheDocument();});
 it('renders event_not_open status without deadline copy',()=>{renderCard('event_not_open',{event:{...event,status:'cancelled'}});expect(screen.getByText('Событие отменено')).toBeInTheDocument();expect(screen.queryByText(/Срок приёма прогнозов завершён/)).not.toBeInTheDocument();});
 it('does not render event_not_found as deadline-ended',()=>{renderCard('event_not_found');expect(screen.queryByText(/Срок приёма прогнозов завершён/)).not.toBeInTheDocument();});
 it('restores option, synchronized probability controls, and reasoning',()=>{renderCard(null,{initialForecast:forecast});expect(screen.getByRole('radio',{name:'Строго выше 120,00 ₽'})).toBeChecked();expect(screen.getByRole('slider')).toHaveValue('50');expect(screen.getByRole('spinbutton')).toHaveValue(50);expect(screen.getByText('50%')).toBeInTheDocument();expect(screen.getByLabelText(/Почему/)).toHaveValue('Серверное обоснование');});
 it('disables all controls and says saving while a request is active',()=>{renderCard(null,{saving:true,initialForecast:forecast});expect(screen.getByRole('button',{name:'Сохраняем…'})).toBeDisabled();expect(screen.getByRole('radio',{name:'Строго выше 120,00 ₽'})).toBeDisabled();expect(screen.getByRole('slider')).toBeDisabled();});
});
