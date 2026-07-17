import { describe, expect, it } from 'vitest';
import { demoDeltaMapData } from '../deltaMap/demoDeltaMapData';
import { boundsFromCenterRadius, sortCityItems, sortNearby, summarizePulse, titleFor, toPulseItem } from './mobilePulseLogic';

describe('mobile Pulse logic',()=>{
 it('excludes archived, invalid activity and includes exact 24-hour boundary',()=>{const now=new Date('2026-01-02T12:00:00Z');const base=demoDeltaMapData[0];const rows=[{...base,id:'boundary',status:'new' as const,lastActivityAt:'2026-01-01T12:00:00Z'},{...base,id:'bad',status:'checking' as const,lastActivityAt:'bad'},{...base,id:'old-confirmed',status:'confirmed' as const,lastActivityAt:'2025-01-01T00:00:00Z'},{...base,id:'archived',status:'archived' as const,lastActivityAt:now.toISOString()}];expect(summarizePulse(rows,now)).toEqual({activeLast24Hours:1,checkingNow:1,confirmedNow:1,forkNow:0});});
 it('ranks newest, then priority, then stable id',()=>{const base=demoDeltaMapData[0];const rows=[{...base,id:'b',lastActivityAt:'2026-01-01',priorityScore:2},{...base,id:'a',lastActivityAt:'2026-01-01',priorityScore:2},{...base,id:'new',lastActivityAt:'2026-01-02',priorityScore:0}];expect(sortCityItems(rows).map(x=>x.id)).toEqual(['new','a','b']);});
 it('sorts nearby by shortest distance',()=>{const items=demoDeltaMapData.slice(0,2).map(x=>toPulseItem(x));expect(sortNearby(items,items[1].lat,items[1].lng)[0].id).toBe(items[1].id);});
 it('keeps bounds valid at high latitude',()=>{const bounds=boundsFromCenterRadius(89.99,179.99,100000);expect(bounds.minLat).toBeGreaterThanOrEqual(-90);expect(bounds.maxLat).toBeLessThanOrEqual(90);expect(bounds.minLng).toBeGreaterThanOrEqual(-180);expect(bounds.maxLng).toBeLessThanOrEqual(180);});
 it('prefers a trimmed card subject and falls back honestly',()=>{const item=demoDeltaMapData[0];expect(titleFor(item,{subject:'  Карточка  '})).toBe('Карточка');expect(titleFor(item,{subject:' '})).toBe(item.statement);expect(titleFor({...item,statement:' '},null)).toBe('Изменение без заголовка');});
});
