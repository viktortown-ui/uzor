import { cleanup,render,screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach,describe,expect,it,vi } from 'vitest';
import type { DeltaCard } from '../deltas/deltaTypes';
import { DesktopDeltaMapCard,MobileDeltaMapCard } from './DeltaMapCard';
const card:DeltaCard={id:'1',category:{slug:'services',title:'Доступность услуг',iconKey:'services'},direction:'positive',subject:'Очередь стала короче',changeType:'faster',statement:'Очередь стала короче стало лучше',details:'Наблюдение',observedWindow:'last_week',impactLevel:'noticeable',status:'checking',moderationState:'visible',confirmCount:2,disconfirmCount:0,confirmationTarget:3,location:{lat:58,lng:56,label:'Выбранная точка в Перми'},priorityScore:1,createdAt:'2026-01-01',lastActivityAt:'2026-01-01',expiresAt:'2027-01-01'};
afterEach(cleanup);
describe('Delta map cards',()=>{
 it('использует subject как заголовок и подписывает вторичный текст',()=>{render(<DesktopDeltaMapCard card={card} onClose={vi.fn()} onReact={vi.fn()}/>);expect(screen.getByRole('heading',{level:2,name:card.subject})).toBeInTheDocument();expect(screen.getByText('Формулировка')).toBeInTheDocument();expect(screen.getByText('Комментарий автора')).toBeInTheDocument()});
 it('мобильная карточка компактна и раскрывается кнопкой',async()=>{render(<MobileDeltaMapCard card={card} onClose={vi.fn()} onReact={vi.fn()}/>);expect(screen.queryByText('Формулировка')).not.toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Подробнее'}));expect(screen.getByText('Формулировка')).toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Свернуть'}));expect(screen.queryByText('Формулировка')).not.toBeInTheDocument()});
 it('пустой subject использует statement',()=>{render(<DesktopDeltaMapCard card={{...card,subject:' '}} onClose={vi.fn()} onReact={vi.fn()}/>);expect(screen.getByRole('heading',{level:2,name:card.statement})).toBeInTheDocument()});
});
