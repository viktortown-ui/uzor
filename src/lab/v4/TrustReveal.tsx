import type { LabV4Data } from './LabV4Types';
export function TrustReveal({ data }: { data: LabV4Data }) { return <details className="v4-trust"><summary>Почему можно доверять этой картине?</summary>{data.trustFacts.map((f) => <p key={f}>{f}</p>)}</details>; }
