import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoDeltaMapData } from '../deltaMap/demoDeltaMapData';
import { wrappedDemoReport } from '../wrapped/wrappedDemoData';
import type { MobilePulseData } from './mobilePulseTypes';

const mocks=vi.hoisted(()=>({load:vi.fn(),nearby:vi.fn(),wrapped:vi.fn()}));
vi.mock('../../app/appMode',()=>({isDemoMode:false,isProductionConfigured:true}));
vi.mock('./mobilePulseData',async(importOriginal)=>{const actual=await importOriginal<typeof import('./mobilePulseData')>();return {...actual,loadMobilePulseData:mocks.load,buildNearbyPulseItems:mocks.nearby};});
vi.mock('../wrapped/wrappedApi',async(importOriginal)=>{const actual=await importOriginal<typeof import('../wrapped/wrappedApi')>();return {...actual,getMyWrappedReport:mocks.wrapped};});
import { MobilePulseJoinError } from './mobilePulseData';
import { toPulseItem } from './mobilePulseLogic';
import { MobilePulsePage } from './MobilePulsePage';

const makeData=(rows=demoDeltaMapData):MobilePulseData=>({summary:{activeLast24Hours:rows.length,checkingNow:1,confirmedNow:1,forkNow:1},items:rows.slice(0,5).map(row=>toPulseItem(row)),allItems:rows,loadedAt:new Date('2026-01-02T12:00:00Z')});
const renderPage=()=>render(<MemoryRouter><MobilePulsePage/></MemoryRouter>);
beforeEach(()=>{mocks.load.mockReset();mocks.nearby.mockReset();mocks.wrapped.mockReset();mocks.load.mockResolvedValue(makeData());mocks.wrapped.mockResolvedValue(wrappedDemoReport);mocks.nearby.mockResolvedValue([toPulseItem(demoDeltaMapData[7])]);Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});});
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();});

describe('MobilePulsePage',()=>{
 it('has no decorative SVG and never requests location automatically',async()=>{const geo={getCurrentPosition:vi.fn()};vi.stubGlobal('navigator',{...navigator,geolocation:geo});renderPage();await screen.findByText(demoDeltaMapData[0].statement);expect(document.querySelector('.mobile-pulse-page svg')).toBeNull();expect(geo.getCurrentPosition).not.toHaveBeenCalled();});
 it('renders city links and keeps the personal trace when the city fails',async()=>{mocks.load.mockRejectedValue(new Error('network'));renderPage();expect(await screen.findByText('Не удалось загрузить Пульс Перми')).toBeInTheDocument();expect(screen.getByText('Добавлено')).toBeInTheDocument();expect(screen.queryByText('Войти по приглашению')).not.toBeInTheDocument();});
 it('distinguishes no-circle from a network error and retries city only',async()=>{mocks.load.mockRejectedValueOnce(new MobilePulseJoinError()).mockResolvedValueOnce(makeData());renderPage();expect(await screen.findByText('Войдите в круг, чтобы видеть Пульс Перми')).toBeInTheDocument();cleanup();mocks.load.mockReset();mocks.load.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(makeData());renderPage();fireEvent.click(await screen.findByRole('button',{name:'Повторить'}));expect(await screen.findByRole('link',{name:new RegExp(demoDeltaMapData[0].statement)})).toHaveAttribute('href','/map?delta=demo-1');expect(mocks.wrapped).toHaveBeenCalledTimes(2);});
 it('keeps city data during refresh and preserves it after refresh failure',async()=>{mocks.load.mockResolvedValueOnce(makeData()).mockRejectedValueOnce(new Error('refresh'));renderPage();const row=await screen.findByText(demoDeltaMapData[0].statement);fireEvent.click(screen.getByRole('button',{name:'Обновить'}));expect(row).toBeInTheDocument();expect(await screen.findByText(/Не удалось обновить данные/)).toBeInTheDocument();expect(row).toBeInTheDocument();});
 it('uses all city rows for nearby and returns to activity order',async()=>{let success:PositionCallback=()=>{};vi.stubGlobal('navigator',{...navigator,geolocation:{getCurrentPosition:vi.fn((callback:PositionCallback)=>{success=callback;})}});renderPage();await screen.findByText(demoDeltaMapData[0].statement);fireEvent.click(screen.getByRole('button',{name:'Показать рядом со мной'}));expect(screen.getByRole('button',{name:'Определяем место…'})).toBeDisabled();success({coords:{latitude:58.0105,longitude:56.2502}} as GeolocationPosition);await screen.findByText(demoDeltaMapData[7].statement);expect(mocks.nearby).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({id:'demo-8'})]),58.0105,56.2502);fireEvent.click(screen.getByRole('button',{name:'Показать город'}));expect(await screen.findByText(demoDeltaMapData[0].statement)).toBeInTheDocument();});
 it('ignores a stale geolocation callback after city refresh',async()=>{let success:PositionCallback=()=>{};vi.stubGlobal('navigator',{...navigator,geolocation:{getCurrentPosition:vi.fn((callback:PositionCallback)=>{success=callback;})}});renderPage();await screen.findByText(demoDeltaMapData[0].statement);fireEvent.click(screen.getByRole('button',{name:'Показать рядом со мной'}));fireEvent.click(screen.getByRole('button',{name:'Обновить'}));success({coords:{latitude:58.0105,longitude:56.2502}} as GeolocationPosition);await waitFor(()=>expect(mocks.load).toHaveBeenCalledTimes(2));expect(mocks.nearby).not.toHaveBeenCalled();expect(screen.queryByText('Рядом с вами')).not.toBeInTheDocument();});
});
