import { describe, expect, it } from 'vitest';
import { isFatalMapLibreError } from './mapLibreErrorPolicy';
describe('mapLibreErrorPolicy',()=>{
 it.each(['tile request failed','glyph fetch failed','sprite image failed','source network timeout'])('не блокирует ресурс: %s',(message)=>expect(isFatalMapLibreError({error:{message}},false)).toBe(false));
 it('блокирует начальную ошибку разбора стиля',()=>expect(isFatalMapLibreError({error:{message:'style parse failure'}},false)).toBe(true));
 it('не блокирует уже пригодную карту',()=>expect(isFatalMapLibreError({error:{message:'style parse failure'}},true)).toBe(false));
});
