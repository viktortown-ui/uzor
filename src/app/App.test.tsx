import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
afterEach(() => cleanup());
import { App } from './App';
const renderAt=(path:string)=>render(<MemoryRouter initialEntries={[path]}><App/></MemoryRouter>);
describe('app',()=>{
 it('мастер вклада проходит 4 шага и показывает кнопку', async()=>{ const u=userEvent.setup(); renderAt('/contribute?layer=tension'); await u.click(screen.getByRole('button',{name:'Дольше ждать транспорт'})); await u.click(screen.getByRole('button',{name:'Работающие'})); await u.click(screen.getByRole('button',{name:'Больше времени в дороге'})); expect(screen.getByRole('button',{name:'Вплести в УЗОР'})).toBeInTheDocument(); });
 it('demo mode показывает заметный бейдж',()=>{ renderAt('/'); expect(screen.getByText('ДЕМО — данные вымышлены')).toBeInTheDocument(); });
 it('reduced-motion режим не ломает сценарий', async()=>{ Object.defineProperty(window,'matchMedia',{writable:true,value:(q:string)=>({matches:q.includes('reduced'),media:q,onchange:null,addListener:()=>undefined,removeListener:()=>undefined,addEventListener:()=>undefined,removeEventListener:()=>undefined,dispatchEvent:()=>false})}); const u=userEvent.setup(); renderAt('/contribute?layer=support'); await u.click(screen.getByRole('button',{name:'Появился удобный маршрут'})); expect(screen.getByText('Кого сильнее касается')).toBeInTheDocument(); });
});
