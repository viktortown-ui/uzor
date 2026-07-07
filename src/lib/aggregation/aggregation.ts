import type { BranchAggregate, ClarityStatus, ContributionInput, Evidence, Intensity, Layer, ThemeSnapshot } from '../../types/domain';

const evidenceFactor: Record<Evidence, number> = { experienced: 1, observed: 0.6 };
const intensityFactor: Record<Intensity, number> = { low: 0.75, medium: 1, high: 1.35 };
const scoreField: Record<Layer, 'tensionScore' | 'supportScore' | 'potentialScore'> = { tension: 'tensionScore', support: 'supportScore', potential: 'potentialScore' };

export function freshnessFactor(updatedAt: string, now = new Date()): number {
  const ageDays = Math.max(0, (now.getTime() - new Date(updatedAt).getTime()) / 86_400_000);
  return Math.exp(-Math.log(2) * ageDays / 21);
}
export function baseWeight(input: Pick<ContributionInput, 'evidence' | 'intensity' | 'updatedAt'>, now = new Date()): number {
  return evidenceFactor[input.evidence] * intensityFactor[input.intensity] * freshnessFactor(input.updatedAt, now);
}
export function upsertContribution(list: ContributionInput[], next: ContributionInput): ContributionInput[] {
  const key = (c: ContributionInput) => [c.userId, c.layer, c.signalId, c.groupId, c.consequenceId].join('|');
  const nextKey = key(next); const index = list.findIndex((c) => key(c) === nextKey);
  return index === -1 ? [...list, next] : list.map((c, i) => (i === index ? { ...c, evidence: next.evidence, intensity: next.intensity, updatedAt: next.updatedAt } : c));
}
function status(clarity: number, participants = 0): ClarityStatus { return clarity < 0.35 || participants < 2 ? 'fog' : clarity < 0.65 ? 'emerging' : 'confirmed'; }
export function aggregateContributions(contributions: ContributionInput[], now = new Date()): ThemeSnapshot {
  const unique = new Map<string, ContributionInput>();
  for (const c of contributions) unique.set([c.userId, c.layer, c.signalId, c.groupId, c.consequenceId].join('|'), c);
  const groups = new Map<string, ContributionInput[]>();
  for (const c of unique.values()) {
    const key = [c.layer, c.signalId, c.consequenceId].join('|');
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const signalConsequences = new Map<string, Map<string, Set<string>>>();
  for (const c of unique.values()) {
    const key = `${c.layer}|${c.signalId}`;
    const m = signalConsequences.get(key) ?? new Map<string, Set<string>>();
    const s = m.get(c.consequenceId) ?? new Set<string>(); s.add(c.userId); m.set(c.consequenceId, s); signalConsequences.set(key, m);
  }
  const branches: BranchAggregate[] = [...groups.entries()].map(([key, rows]) => {
    const [layer, signalId, consequenceId] = key.split('|') as [Layer, string, string];
    const users = new Set(rows.map((r) => r.userId)); const groupSet = new Set(rows.map((r) => r.groupId)); const evidences = new Set(rows.map((r) => r.evidence));
    const latestByUser = [...users].map((userId) => rows.filter((r) => r.userId === userId).sort((a,b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0]);
    const effectiveWeight = latestByUser.reduce((sum, row) => sum + baseWeight(row, now), 0);
    const distinctGroups = groupSet.size; const diversityBonus = 1 + Math.min(0.3, 0.08 * (distinctGroups - 1));
    const strength = Math.log(1 + effectiveWeight) * diversityBonus; const evidenceDiversity = evidences.size > 1 ? 1 : 0.5;
    const clarity = Math.min(1, 0.18 * Math.sqrt(users.size) + 0.14 * Math.sqrt(distinctGroups) + 0.10 * evidenceDiversity);
    const groupBreakdown = [...groupSet].map((gid) => { const groupRows = rows.filter((r) => r.groupId === gid); return { groupId: gid, participantCount: new Set(groupRows.map((r) => r.userId)).size, strength: groupRows.reduce((sum, r) => sum + baseWeight(r, now), 0) }; }).sort((a,b) => b.strength - a.strength);
    const dominantGroups = groupBreakdown.slice(0, 2).map((g) => g.groupId);
    const scores = { tensionScore: 0, supportScore: 0, potentialScore: 0 }; scores[scoreField[layer]] = strength;
    const consequenceSets = signalConsequences.get(`${layer}|${signalId}`); const strongConsequences = [...(consequenceSets?.values() ?? [])].filter((set) => set.size >= 3).length;
    return { id: key, layer, signalId, consequenceId, participantCount: users.size, distinctGroups, dominantGroups, groupBreakdown, evidenceDiversity, strength, clarity, status: status(clarity, users.size), ...scores, isDivergence: strongConsequences >= 2 };
  });
  const convergenceMap = new Map<string, number>();
  for (const b of branches) convergenceMap.set(b.consequenceId, (convergenceMap.get(b.consequenceId) ?? 0) + b.strength);
  const participantCount = new Set([...unique.values()].map((c) => c.userId)).size;
  const clarity = branches.length ? branches.reduce((s, b) => s + b.clarity, 0) / branches.length : 0;
  return { participantCount, branchCount: branches.length, threadCount: unique.size, branches, convergence: [...convergenceMap.entries()].map(([consequenceId, influence]) => ({ consequenceId, influence })).sort((a,b) => b.influence - a.influence), clarity };
}
