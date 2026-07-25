import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createInteractiveDemoEvent } from './forecastUiLogic';
import { ForecastOutcomeView } from './ForecastOutcomeView';

const event={...createInteractiveDemoEvent(),status:'resolved' as const};
const outcome={id:'o',eventId:event.id,resolvedOptionId:event.options[0].id,resolvedAt:'2026-12-15T12:00:00Z',sourceReference:'https://example.test/result',sourceType:event.resolutionSource,resolutionNote:'Проверено человеком',resolverStatus:'verified' as const,version:'forecast-domain-v1' as const};
afterEach(cleanup);
describe('ForecastOutcomeView',()=>{
 it('shows neutral verified outcome and saved forecast without scoring language',()=>{render(<ForecastOutcomeView event={event} outcome={outcome} forecast={{id:'f',eventId:event.id,selectedOptionId:event.options[1].id,probability:.7,createdAt:'2026-12-01T00:00:00Z',updatedAt:'2026-12-01T00:00:00Z',version:'forecast-domain-v1'}}/>);expect(screen.getByRole('heading',{name:'Исход проверен'})).toBeInTheDocument();expect(screen.getByText('Ваш выбранный вариант')).toBeInTheDocument();expect(screen.getByText('Проверенный исход')).toBeInTheDocument();expect(document.body.textContent).not.toMatch(/Brier|репутац|точност|угадал|проиграл|победил/i);const link=screen.getByRole('link',{name:outcome.sourceReference});expect(link).toHaveAttribute('target','_blank');expect(link).toHaveAttribute('rel','noopener noreferrer');});
 it('renders a non-URL reference as text',()=>{render(<ForecastOutcomeView event={event} outcome={{...outcome,sourceReference:'Бюллетень № 17'}} forecast={null}/>);expect(screen.getByText('Бюллетень № 17').tagName).not.toBe('A');});
});
