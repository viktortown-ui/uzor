import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../../app/App';
import { ForecastPage } from './ForecastPage';

afterEach(cleanup);
function media(mobile:boolean){Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>({matches:mobile,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});}
describe('ForecastPage discoverability',()=>{
 it('renders at the production /forecast route',async()=>{media(false);render(<MemoryRouter initialEntries={['/forecast']}><App/></MemoryRouter>);expect(await screen.findByRole('heading',{level:1,name:'Сформулируйте проверяемый прогноз'})).toBeInTheDocument();});
 it('renders the production workspace with one h1 and desktop navigation',()=>{media(false);render(<MemoryRouter initialEntries={['/forecast']}><ForecastPage/></MemoryRouter>);expect(screen.getByRole('heading',{level:1,name:'Сформулируйте проверяемый прогноз'})).toBeInTheDocument();const nav=screen.getByRole('complementary',{name:'Основная навигация'});expect(within(nav).getByRole('link',{name:'Прогнозы'})).toHaveAttribute('aria-current','page');});
 it('offers a Pulse return and leaves every mobile dock item inactive',()=>{media(true);render(<MemoryRouter initialEntries={['/forecast']}><ForecastPage/></MemoryRouter>);expect(screen.getByRole('link',{name:/Вернуться в Пульс/})).toHaveAttribute('href','/pulse');expect(screen.getByRole('link',{name:'Прогнозы'})).toHaveAttribute('aria-current','page');});
 it('does not present forbidden collective or reward metrics in the form',()=>{media(false);render(<MemoryRouter><ForecastPage/></MemoryRouter>);expect(document.body.textContent).not.toMatch(/XP|accuracy|leaderboard|public consensus|участников/i);});
});
