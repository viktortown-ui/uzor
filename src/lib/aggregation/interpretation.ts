import type { CatalogItem, ThemeSnapshot } from '../../types/domain';
export function themeStatus(c: number): string { return c < 0.25 ? 'Картина ещё собирается' : c < 0.55 ? 'Картина проявляется' : 'Картина становится яснее'; }
export function snapshotText(snapshot: ThemeSnapshot, catalog: CatalogItem[]): string[] {
 const label = (id:string)=> catalog.find(i=>i.id===id)?.label ?? 'одной из точек';
 if (!snapshot.threadCount) return ['Здесь пока туман. Добавь первую нить — с неё начнётся общая картина.'];
 if (snapshot.threadCount < 3) return ['Картина только собирается. Уже появились первые нити, но общего вывода пока нет.'];
 const lines: string[] = [];
 const top = snapshot.convergence[0]; if (top) lines.push(`Сейчас в теме чаще всего сходятся нити вокруг: ${label(top.consequenceId)}.`);
 const tension = snapshot.branches.filter(b=>b.layer==='tension').sort((a,b)=>b.strength-a.strength)[0]; if (tension) lines.push(`По откликам заметнее напряжение вокруг «${label(tension.signalId)}».`);
 const support = snapshot.branches.filter(b=>b.layer==='support').sort((a,b)=>b.strength-a.strength)[0]; if (support) lines.push(`Из поддержки сейчас проявляется «${label(support.signalId)}».`);
 if (snapshot.branches.some(b=>b.isDivergence)) lines.push('Эта ситуация по-разному отражается на людях: появилась развилка.');
 return lines.slice(0,4);
}
