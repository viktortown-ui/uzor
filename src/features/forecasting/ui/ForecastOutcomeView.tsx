import type { ForecastEvent, ForecastOutcome, UserForecast } from '../types';
import { formatResolutionSource, formatRussianUtcDateTime } from './forecastUiLogic';

const safeUrl=(value:string)=>{try{const url=new URL(value);return url.protocol==='http:'||url.protocol==='https:'?url.href:null;}catch{return null;}};
export function ForecastOutcomeView({event,outcome,forecast}:{event:ForecastEvent;outcome:ForecastOutcome;forecast:UserForecast|null}){
 const resolved=event.options.find(option=>option.id===outcome.resolvedOptionId)?.label;
 const selected=forecast&&event.options.find(option=>option.id===forecast.selectedOptionId)?.label;
 const url=safeUrl(outcome.sourceReference);
 return <section className="forecast-outcome" aria-labelledby="verified-outcome-title"><h2 id="verified-outcome-title">Исход проверен</h2><dl><div><dt>Проверенный исход</dt><dd>{resolved}</dd></div><div><dt>Время фиксации</dt><dd>{formatRussianUtcDateTime(outcome.resolvedAt)}</dd></div><div><dt>Тип источника</dt><dd>{formatResolutionSource(outcome.sourceType)}</dd></div><div><dt>Источник</dt><dd>{url?<a href={url} target="_blank" rel="noopener noreferrer">{outcome.sourceReference}</a>:outcome.sourceReference}</dd></div><div><dt>Примечание о проверке</dt><dd>{outcome.resolutionNote}</dd></div>{forecast&&<><div><dt>Ваш выбранный вариант</dt><dd>{selected}</dd></div><div><dt>Ваша вероятность</dt><dd>{Math.round(forecast.probability*100)}%</dd></div></>}</dl><p>Математическая оценка прогноза появится на следующем этапе.</p></section>;
}
