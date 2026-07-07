import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FutureFlow } from './FutureFlow';
import { InsightHero } from './InsightHero';
import { LabV4Controls } from './LabV4Controls';
import { labV4Scenarios, resolveScenario } from './LabV4Data';
import { LivingFlowScene } from './LivingFlowScene';
import { PersonalPosition } from './PersonalPosition';
import { ReturnLoop } from './ReturnLoop';
import { TrustReveal } from './TrustReveal';
import type { LabV4Choice, LabV4Copy, LabV4Step } from './LabV4Types';
import { WhyScene } from './WhyScene';
import './labV4.css';

function resolveStep(value: string | null): LabV4Step { return value === 'future' || value === 'why' ? value : 'now'; }
function resolveCopy(value: string | null): LabV4Copy { return value === 'b' || value === 'c' ? value : 'a'; }

export function LabV4Shell() {
  const [params] = useSearchParams();
  const scenario = resolveScenario(params.get('scenario'), params.get('scale'));
  const step = resolveStep(params.get('step'));
  const copy = resolveCopy(params.get('copy'));
  const data = labV4Scenarios[scenario];
  const [choice, setChoice] = useState<LabV4Choice | null>(null);
  const [participated, setParticipated] = useState(false);
  return <main className="lab-v4-shell">
    <InsightHero data={data} copy={copy} onParticipate={(kind) => { setParticipated(true); setChoice(kind === 'match' ? data.mainPath.source as LabV4Choice : 'Пока не знаю'); }} />
    <LabV4Controls step={step} scenario={scenario} copy={copy} />
    {step === 'now' && <LivingFlowScene data={data} participated={participated || Boolean(choice)} />}
    {step === 'future' && <FutureFlow data={data} />}
    {step === 'why' && <WhyScene data={data} />}
    <PersonalPosition data={data} choice={choice} onChoice={(c) => { setChoice(c); setParticipated(true); }} />
    <ReturnLoop data={data} visible={participated || Boolean(choice)} />
    <TrustReveal data={data} />
  </main>;
}
