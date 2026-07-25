import { Link } from 'react-router-dom';
import { ProductShell } from '../../../app/ProductShell';
import { ForecastCard } from './ForecastCard';
import { createInteractiveDemoEvent } from './forecastUiLogic';
import './forecastUi.css';

export function ForecastPage() {
  const event = createInteractiveDemoEvent();
  return <ProductShell className="forecast-shell"><div className="forecast-page"><header className="forecast-page__header"><Link to="/pulse" className="forecast-back">← Вернуться в Пульс</Link><p className="forecast-kicker">ПРОГНОЗЫ · ДЕМО</p><h1>Сформулируйте проверяемый прогноз</h1><p>Выберите конкретный исход и честно укажите свою вероятность. Это не наблюдение-Дельта и не коллективная статистика.</p></header><ForecastCard event={event} /></div></ProductShell>;
}
