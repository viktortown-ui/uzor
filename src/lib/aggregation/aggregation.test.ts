import { describe, expect, it } from 'vitest';
import { aggregateContributions, baseWeight, upsertContribution } from './aggregation';
import type { ContributionInput } from '../../types/domain';
const now = new Date('2026-07-07T00:00:00Z');
const c = (p: Partial<ContributionInput>): ContributionInput => ({ id: crypto.randomUUID(), userId: 'u', layer: 'tension', signalId: 's', groupId: 'g', consequenceId: 'c', evidence: 'experienced', intensity: 'medium', updatedAt: now.toISOString(), ...p });
describe('aggregation', () => {
 it('позитив и напряжение не взаимоуничтожаются', () => { const s=aggregateContributions([c({layer:'tension'}),c({userId:'u2',layer:'support',signalId:'s2'})],now); expect(s.branches.some(b=>b.tensionScore>0)).toBe(true); expect(s.branches.some(b=>b.supportScore>0)).toBe(true); });
 it('10 откликов одного пользователя не дают вес 10 разных людей', () => { const many=Array.from({length:10},(_,i)=>c({id:String(i),intensity:i%2?'high':'low'})); expect(aggregateContributions(many,now).branches[0].participantCount).toBe(1); });
 it('experienced тяжелее observed', () => { expect(baseWeight(c({evidence:'experienced'}),now)).toBeGreaterThan(baseWeight(c({evidence:'observed'}),now)); });
 it('свежий вклад тяжелее 42-дневного', () => { expect(baseWeight(c({}),now)).toBeGreaterThan(baseWeight(c({updatedAt:'2026-05-26T00:00:00Z'}),now)); });
 it('две разные группы дают diversity bonus', () => { const one=aggregateContributions([c({userId:'u1'})],now).branches[0].strength; const two=aggregateContributions([c({userId:'u1'}),c({userId:'u2',groupId:'g2'})],now).branches[0].strength; expect(two).toBeGreaterThan(one); });
 it('при двух последствиях одного сигнала появляется Развилка', () => { const rows=['a','b'].flatMap((cons)=>[1,2,3].map(i=>c({userId:`${cons}${i}`,consequenceId:cons}))); expect(aggregateContributions(rows,now).branches.every(b=>b.isDivergence)).toBe(true); });
 it('low clarity даёт Туман', () => { expect(aggregateContributions([c({})],now).branches[0].status).toBe('fog'); });
 it('одинаковый contribution update не создаёт второй вклад', () => { const list=upsertContribution([c({intensity:'low'})],c({intensity:'high'})); expect(list).toHaveLength(1); expect(list[0].intensity).toBe('high'); });
});
