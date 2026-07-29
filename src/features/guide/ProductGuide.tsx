import { Link } from 'react-router-dom';
import './productGuide.css';

const steps = [
  ['1', 'Заметить', 'Заметили изменение рядом?'], ['2', 'Отметить', 'Добавьте Дельту и укажите место.'],
  ['3', 'Проверить', 'Другие жители подтверждают или не подтверждают наблюдение.'],
  ['4', 'Прочитать', 'Карта показывает новые сигналы, проверки, подтверждения и развилки.'],
  ['5', 'Понять', 'Недельный Пульс показывает не рейтинг людей, а проявляющиеся изменения.'],
];
export function ProductGuide({ compact = false }: { compact?: boolean }) {
  return <div className={`product-guide${compact ? ' is-compact' : ''}`}><section><p className="eyebrow">Пять шагов</p><h2>Как город складывается в УЗОР</h2><div className="guide-steps">{steps.map(([number,title,body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section><h2>Как читать статусы</h2><div className="guide-legend"><p><i className="new"/>Новая Дельта — наблюдение только появилось.</p><p><i className="checking"/>Проверка — жители собирают независимые отклики.</p><p><i className="confirmed"/>Подтверждена — достигнута цель подтверждений.</p><p><i className="fork"/>Развилка — место видят по-разному.</p><p><i className="archived"/>Архив — сигнал больше не активен на карте.</p></div></section>
    <section><h2>Три разных слоя будущего</h2><div className="guide-layers"><article><strong>Наблюдение</strong><p>Что уже произошло и было замечено.</p></article><article><strong>Ожидание</strong><p>Чего люди ожидают; это не установленный факт.</p></article><article><strong>Прогноз</strong><p>Расчётная оценка будущего, а не уверенность или обещание.</p></article></div><p className="guide-warning">Не смешивайте эти слои. Мнение жителей не заменяет официальные факты, статистику или обращение в городскую службу.</p></section>
    <section><h2>Попробовать сейчас</h2><div className="guide-actions"><Link to="/map">Открыть карту</Link><Link to="/map?delta=demo-delta-1">Выбрать Дельту</Link><Link to="/contribute">Добавить Дельту</Link><Link to="/pulse">Открыть Пульс</Link></div></section></div>;
}
