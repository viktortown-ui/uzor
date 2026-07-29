import { Link } from 'react-router-dom';
import { ProductGuide } from './ProductGuide';
export function AboutPage(){return <main className="about-page"><header className="guide-public-header"><Link to="/">УЗОР</Link><Link to="/auth">Войти</Link></header><article><p className="eyebrow">Гид по продукту</p><h1>Карта городских изменений</h1><p className="guide-lead">Жители отмечают Дельты, независимо проверяют их и видят, как отдельные наблюдения складываются в недельный пульс Перми.</p><ProductGuide /></article></main>}
