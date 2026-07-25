import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ForecastEvent, UserForecast } from '..';
import type { ForecastLockReason } from '../api/forecastApiTypes';
import {
  buildDemoForecast, formatEventStatus, formatResolution, formatResolutionSource,
  formatRussianUtcDateTime, parsePercentage, validateDemoForecast, validationResultMessage,
} from './forecastUiLogic';

type Stage = 'form' | 'review' | 'result';
export interface ProductionForecastCardProps { event: ForecastEvent; initialForecast: UserForecast|null; submissionPermitted: boolean; locked: boolean; lockReason: ForecastLockReason; authenticationRequired: boolean; saving: boolean; error?: string; savedAt?: string; onSubmit: (value:{optionId:string;probability:number;reasoning?:string})=>void; }

export function ForecastCard(props: { event: ForecastEvent; production?: ProductionForecastCardProps }) {
  if (props.production) return <ProductionForecastCard {...props.production}/>;
  return <DemoForecastCard event={props.event}/>;
}

function DemoForecastCard({ event }: { event: ForecastEvent }) {
  const [selected, setSelected] = useState('');
  const [percentage, setPercentage] = useState('');
  const [probabilityInitialized, setProbabilityInitialized] = useState(false);
  const [reasoning, setReasoning] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const transitionHeading = useRef<HTMLHeadingElement>(null);
  const parsed = parsePercentage(percentage);
  const forecast = useMemo<UserForecast | undefined>(() => selected && parsed.valid
    ? buildDemoForecast(event, selected, parsed.percentage, reasoning) : undefined,
  [event, parsed, reasoning, selected]);
  const domainResult = forecast ? validateDemoForecast(event, forecast) : undefined;
  const domainError = domainResult ? validationResultMessage(domainResult) : undefined;
  const available = event.status === 'open';
  const canReview = available && Boolean(selected) && parsed.valid && domainResult?.valid === true;
  const selectedOption = event.options.find((option) => option.id === selected);
  const numericValue = parsed.valid ? parsed.percentage : 0;

  useEffect(() => { if (stage !== 'form') transitionHeading.current?.focus(); }, [stage]);
  const updateRange = (value: string) => setPercentage(value);
  const selectOption = (optionId: string) => {
    setSelected(optionId);
    if (!probabilityInitialized) {
      setPercentage('50');
      setProbabilityInitialized(true);
    }
  };
  const review = () => { if (canReview) setStage('review'); };

  return <article className="forecast-card">
    <section className="forecast-event" aria-labelledby="forecast-event-title">
      <div className="forecast-event__badges"><span>{event.category}</span><span>Вымышленное событие</span></div>
      <p className="forecast-demo-label">Интерактивное демо · время сценария зафиксировано</p>
      <h2 id="forecast-event-title">{event.title}</h2>
      <dl className="forecast-event__facts">
        <div><dt>География</dt><dd>{event.geographicScope ?? event.cityId ?? 'Не указана'}</dd></div>
        <div><dt>Точное условие разрешения</dt><dd>{event.shortDescription}</dd></div>
        <div><dt>Приём прогнозов до</dt><dd>{formatRussianUtcDateTime(event.closesAt)}</dd></div>
        <div><dt>Ожидаемое разрешение</dt><dd>{formatResolution(event)}</dd></div>
        <div><dt>Источник проверки</dt><dd>{formatResolutionSource(event.resolutionSource)}</dd></div>
      </dl>
      <div className="forecast-distinction"><p><strong>Ожидание</strong> — мнение о направлении без численной вероятности.</p><p><strong>Прогноз</strong> — конкретный вариант и вероятность от 0% до 100%.</p></div>
    </section>

    <section className="forecast-workspace">
      {!available && <div className="forecast-status" role="status"><strong>{formatEventStatus(event.status)}</strong><p>Собрать прогноз для события в этом состоянии нельзя.</p></div>}
      {stage === 'form' && <form onSubmit={(formEvent) => { formEvent.preventDefault(); review(); }}>
        <fieldset disabled={!available}><legend>Какой исход вы выбираете?</legend><div className="forecast-options">
          {event.options.map((option) => <label key={option.id} className={selected === option.id ? 'selected' : ''}><input type="radio" name={`outcome-${event.id}`} value={option.id} checked={selected === option.id} onChange={() => selectOption(option.id)} /><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span></label>)}
        </div></fieldset>
        {selected && <fieldset className="forecast-probability" disabled={!available}><legend>Насколько вероятен выбранный исход?</legend>
          <p className="sr-only">Вероятность относится к выбранному варианту: {selectedOption?.label}.</p>
          <div className="forecast-gauge" style={{ '--forecast-value': `${numericValue * 3.6}deg` } as React.CSSProperties}><span>{parsed.valid ? `${parsed.percentage}%` : '—'}</span></div>
          <label htmlFor={`probability-range-${event.id}`}>Вероятность, от 0 до 100 процентов</label>
          <input id={`probability-range-${event.id}`} type="range" min="0" max="100" step="1" value={parsed.valid ? parsed.percentage : 50} onChange={(e) => updateRange(e.target.value)} />
          <label htmlFor={`probability-number-${event.id}`}>Вероятность в процентах</label>
          <div className="forecast-number"><input id={`probability-number-${event.id}`} type="number" min="0" max="100" step="1" value={percentage} onChange={(e) => setPercentage(e.target.value)} aria-invalid={!parsed.valid} /><span>%</span></div>
          <div className="forecast-anchors"><span>50% — равные шансы</span><span>70% — заметный перевес</span><span>90% — высокая уверенность</span></div>
          {!parsed.valid && <p className="forecast-error" role="alert">{parsed.message}</p>}
        </fieldset>}
        <div className="forecast-reasoning"><label htmlFor={`reasoning-${event.id}`}>Почему вы так думаете? <small>необязательно</small></label><textarea id={`reasoning-${event.id}`} maxLength={280} value={reasoning} onChange={(e) => setReasoning(e.target.value)} disabled={!available} /><span>{reasoning.length}/280</span></div>
        {domainError && selected && parsed.valid && <p className="forecast-error" role="alert">{domainError}</p>}
        <button className="forecast-primary" type="submit" disabled={!canReview}>Проверить прогноз</button>
      </form>}

      {stage === 'review' && forecast && <div className="forecast-review"><h2 ref={transitionHeading} tabIndex={-1}>Проверьте прогноз</h2><dl><div><dt>Выбранный исход</dt><dd>{selectedOption?.label}</dd></div><div><dt>Вероятность</dt><dd>{percentage}%</dd></div><div><dt>Обоснование</dt><dd>{forecast.reasoning ?? 'Не добавлено'}</dd></div><div><dt>Приём прогнозов до</dt><dd>{formatRussianUtcDateTime(event.closesAt)}</dd></div></dl><p>При реальной отправке прогноз будет зафиксирован. После окончания срока его нельзя будет изменить.</p><div className="forecast-review__actions"><button type="button" onClick={() => setStage('form')}>Изменить</button><button className="forecast-primary" type="button" onClick={() => setStage('result')}>Собрать демо-прогноз</button></div></div>}
      {stage === 'result' && <div className="forecast-result"><h2 ref={transitionHeading} tabIndex={-1}>Демо-прогноз собран</h2><p>Это только локальный результат текущего экрана:</p><ul><li>прогноз не отправлен на сервер;</li><li>прогноз не сохранён после перезагрузки;</li><li>он не влияет на репутацию;</li><li>Brier Score появится только после проверенного исхода в будущей версии.</li></ul><button type="button" onClick={() => setStage('form')}>Изменить</button></div>}
    </section>
  </article>;
}

function ProductionForecastCard({event,initialForecast,submissionPermitted,locked,lockReason,authenticationRequired,saving,error,savedAt,onSubmit}:ProductionForecastCardProps){
 const [selected,setSelected]=useState(initialForecast?.selectedOptionId??'');
 const [percentage,setPercentage]=useState(initialForecast?String(initialForecast.probability*100):'');
 const [reasoning,setReasoning]=useState(initialForecast?.reasoning??'');
 const parsed=parsePercentage(percentage); const readonly=locked||!submissionPermitted; const option=event.options.find(o=>o.id===selected); const numericValue=parsed.valid?parsed.percentage:0;
 return <article className="forecast-card"><section className="forecast-event" aria-labelledby="forecast-event-title"><div className="forecast-event__badges"><span>{event.category}</span><span>Вымышленное событие</span></div><p className="forecast-demo-label">Вымышленное событие · прогноз сохраняется в вашем аккаунте</p><h2 id="forecast-event-title">{event.title}</h2><dl className="forecast-event__facts"><div><dt>Точное условие разрешения</dt><dd>{event.shortDescription}</dd></div><div><dt>Приём прогнозов до</dt><dd>{formatRussianUtcDateTime(event.closesAt)}</dd></div><div><dt>Источник проверки</dt><dd>{formatResolutionSource(event.resolutionSource)}</dd></div></dl></section><section className="forecast-workspace">
 {authenticationRequired||lockReason==='not_authenticated'?<div className="forecast-status"><strong>Чтобы сохранить прогноз, войдите в круг.</strong><p><Link className="forecast-primary" to="/join">Войти</Link></p></div>:<>
 {lockReason==='before_open'&&<div className="forecast-status" role="status"><strong>Приём прогнозов ещё не начался.</strong></div>}
 {lockReason==='deadline_passed'&&<div className="forecast-status" role="status"><strong>Срок приёма прогнозов завершён.</strong>{initialForecast&&<p>Прогноз зафиксирован и больше не может быть изменён.</p>}</div>}
 {lockReason==='event_not_open'&&<div className="forecast-status" role="status"><strong>{formatEventStatus(event.status)}</strong><p>Для события в этом статусе прогноз изменить нельзя.</p></div>}
 {initialForecast&&<div className="forecast-status"><strong>{locked?'Ваш зафиксированный прогноз':'Ваш прогноз сохранён'}</strong><p>ID: {initialForecast.id} · создан: {formatRussianUtcDateTime(initialForecast.createdAt)}</p></div>}
 <form onSubmit={e=>{e.preventDefault();if(!saving&&!readonly&&selected&&parsed.valid)onSubmit({optionId:selected,probability:parsed.percentage/100,reasoning:reasoning.trim()||undefined});}}><fieldset disabled={readonly||saving}><legend>Какой исход вы выбираете?</legend><div className="forecast-options">{event.options.map(o=><label key={o.id} className={selected===o.id?'selected':''}><input type="radio" name={`outcome-${event.id}`} checked={selected===o.id} onChange={()=>{setSelected(o.id);if(!percentage)setPercentage('50');}}/><span><strong>{o.label}</strong></span></label>)}</div></fieldset>
 {selected&&<fieldset className="forecast-probability" disabled={readonly||saving}><legend>Насколько вероятен выбранный исход?</legend><div className="forecast-gauge" style={{'--forecast-value':`${numericValue*3.6}deg`} as React.CSSProperties}><span>{parsed.valid?`${parsed.percentage}%`:'—'}</span></div><label htmlFor={`probability-range-${event.id}`}>Вероятность, от 0 до 100 процентов</label><input id={`probability-range-${event.id}`} type="range" min="0" max="100" step="1" value={parsed.valid?parsed.percentage:50} onChange={e=>setPercentage(e.target.value)}/><label htmlFor={`probability-${event.id}`}>Вероятность в процентах</label><div className="forecast-number"><input id={`probability-${event.id}`} type="number" min="0" max="100" value={percentage} aria-invalid={!parsed.valid} onChange={e=>setPercentage(e.target.value)}/><span>%</span></div>{!parsed.valid&&<p className="forecast-error" role="alert">{parsed.message}</p>}</fieldset>}
 <div className="forecast-reasoning"><label htmlFor={`reasoning-${event.id}`}>Почему вы так думаете? <small>необязательно</small></label><textarea id={`reasoning-${event.id}`} maxLength={280} value={reasoning} disabled={readonly||saving} onChange={e=>setReasoning(e.target.value)}/><span>{reasoning.length}/280</span></div>{error&&<p className="forecast-error" role="alert">{error}</p>}{!readonly&&<button className="forecast-primary" type="submit" disabled={saving||!selected||!parsed.valid}>{saving?'Сохраняем…':initialForecast?'Обновить прогноз':'Сохранить прогноз'}</button>}</form>
 {(savedAt||initialForecast)&&<div className="forecast-result"><h2>{savedAt?'Прогноз сохранён':'Ваш прогноз сохранён'}</h2><p>{option?.label} · {parsed.valid?parsed.percentage:'—'}%</p>{reasoning&&<p>{reasoning}</p>}<p>{savedAt&&<>Сохранено сервером: {formatRussianUtcDateTime(savedAt)}. </>}Срок: {formatRussianUtcDateTime(event.closesAt)}. Изменить прогноз можно только до срока.</p></div>}
 </>}</section></article>;
}
