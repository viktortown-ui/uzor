import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isProductionConfigured } from '../../../app/appMode';
import { ProductShell } from '../../../app/ProductShell';
import { CurrentForecastExample } from '../../forecasting/ui/CurrentForecastExample';
import { castVote, listPublicProposals } from '../api/forecastQuestionApi';
import type { ConsiderationVote, PublicProposal } from '../api/forecastQuestionApiTypes';
import { ForecastProposalCard } from './ForecastProposalCard';
import './forecastQuestions.css';
type LoadState = 'loading' | 'loaded' | 'error';
export function ForecastFutureHub() {
  const [items, setItems] = useState<PublicProposal[]>([]); const [state, setState] = useState<LoadState>(isProductionConfigured ? 'loading' : 'loaded');
  const [pendingId, setPendingId] = useState(''); const [errors, setErrors] = useState<Record<string, string>>({});
  const load = useCallback(async () => { if (!isProductionConfigured) return; setState('loading'); try { setItems(await listPublicProposals()); setState('loaded'); } catch { setState('error'); } }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  const voting = async (id: string, vote: ConsiderationVote) => { if (pendingId) return; setPendingId(id); setErrors(current => ({ ...current, [id]: '' })); try { const counts = await castVote(id, vote); setItems(current => current.map(item => item.id === id ? { ...item, ...counts } : item)); } catch { setErrors(current => ({ ...current, [id]: 'Не удалось сохранить выбор. Попробуйте ещё раз.' })); } finally { setPendingId(''); } };
  return <ProductShell className="future-shell"><div className="future-page"><header className="future-hero"><p className="future-badge">ЭКСПЕРИМЕНТАЛЬНЫЙ РАЗДЕЛ</p><h1>Будущее города</h1><p>Здесь жители предлагают темы о будущем города. Сообщество показывает, какие темы стоит рассмотреть, а редактор превращает выбранные темы в точные и проверяемые вопросы.</p><p>Это эксперимент УЗОРА. Ответы участников не являются официальным прогнозом, обещанием или решением.</p><p className="future-process">Предложение → Рассмотрение → Проверяемый вопрос → Экспериментальный прогноз → Исход</p><div className="future-actions"><Link to="/forecast/propose">Предложить вопрос</Link><Link to="/forecast/mine">Мои предложения</Link></div></header><section><h2>Стоит рассмотреть</h2><p>Здесь выбирают темы для подготовки. Это ещё не прогноз и не голосование за будущий исход.</p>{!isProductionConfigured ? <p className="future-empty">Демонстрационный режим: общественное рассмотрение доступно в подключённой версии.</p> : state === 'loading' ? <p role="status">Загружаем темы…</p> : state === 'error' ? <div className="future-error" role="alert"><p>Не удалось загрузить темы для рассмотрения.</p><button onClick={() => void load()}>Повторить</button></div> : items.length ? items.map(proposal => <ForecastProposalCard key={proposal.id} proposal={proposal} busy={pendingId === proposal.id} error={errors[proposal.id]} onVote={vote => void voting(proposal.id, vote)} />) : <p className="future-empty">Пока нет тем, открытых для общественного рассмотрения</p>}</section><section><h2>Пример экспериментального прогноза</h2><p>Здесь можно проверить механику личной вероятности, дедлайна, исхода и математической оценки одного прогноза.</p><CurrentForecastExample /></section></div></ProductShell>;
}
