import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { isProductionConfigured } from "../../../app/appMode";
import { ProductShell } from "../../../app/ProductShell";
import { CurrentForecastExample } from "../../forecasting/ui/CurrentForecastExample";
import { castVote, listPublicProposals } from "../api/forecastQuestionApi";
import type {
  ConsiderationVote,
  PublicProposal,
} from "../api/forecastQuestionApiTypes";
import { ForecastProposalCard } from "./ForecastProposalCard";
import "./forecastQuestions.css";
import {
  forecastVisualFixturesActive,
  visualPublicProposals,
} from "./visualFixtures";
type LoadState = "loading" | "loaded" | "error";
export function ForecastFutureHub() {
  const [items, setItems] = useState<PublicProposal[]>(
    forecastVisualFixturesActive ? visualPublicProposals : [],
  );
  const [state, setState] = useState<LoadState>(
    isProductionConfigured && !forecastVisualFixturesActive
      ? "loading"
      : "loaded",
  );
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const pendingIdsRef = useRef(new Set<string>());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    if (!isProductionConfigured || forecastVisualFixturesActive) return;
    setState("loading");
    try {
      setItems(await listPublicProposals());
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  const voting = async (id: string, vote: ConsiderationVote) => {
    if (pendingIdsRef.current.has(id)) return;
    pendingIdsRef.current.add(id);
    setPendingIds((current) => new Set(current).add(id));
    setErrors((current) => ({ ...current, [id]: "" }));
    try {
      if (forecastVisualFixturesActive) {
        setItems((current) =>
          current.map((item) => {
            if (item.id !== id) return item;
            const supportDelta =
              (vote === "support" ? 1 : 0) -
              (item.viewerVote === "support" ? 1 : 0);
            const notNowDelta =
              (vote === "not_now" ? 1 : 0) -
              (item.viewerVote === "not_now" ? 1 : 0);
            return {
              ...item,
              supportCount: item.supportCount + supportDelta,
              notNowCount: item.notNowCount + notNowDelta,
              totalVotes: item.totalVotes + (item.viewerVote ? 0 : 1),
              viewerVote: vote,
            };
          }),
        );
        return;
      }
      const counts = await castVote(id, vote);
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...counts } : item)),
      );
    } catch {
      setErrors((current) => ({
        ...current,
        [id]: "Не удалось сохранить выбор. Попробуйте ещё раз.",
      }));
    } finally {
      pendingIdsRef.current.delete(id);
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };
  return (
    <ProductShell className="future-shell">
      <div className="future-page">
        <header className="future-hero">
          <p className="future-badge">ЭКСПЕРИМЕНТАЛЬНЫЙ РАЗДЕЛ</p>
          <h1>Будущее города</h1>
          <p>
            Здесь жители предлагают темы о будущем города. Сообщество
            показывает, какие темы стоит рассмотреть, а редактор превращает
            выбранные темы в точные и проверяемые вопросы.
          </p>
          <p>
            Это эксперимент УЗОРА. Ответы участников не являются официальным
            прогнозом, обещанием или решением.
          </p>
          <p className="future-process">
            Предложение → Рассмотрение → Проверяемый вопрос → Экспериментальный
            прогноз → Исход
          </p>
          <div className="future-actions">
            <Link to="/forecast/propose">Предложить вопрос</Link>
            <Link to="/forecast/mine">Мои предложения</Link>
          </div>
        </header>
        <section
          aria-labelledby="future-consideration-title"
          data-testid="future-consideration"
        >
          <h2 id="future-consideration-title">Стоит рассмотреть</h2>
          <p>
            Здесь выбирают темы для подготовки. Это ещё не прогноз и не
            голосование за будущий исход.
          </p>
          {!isProductionConfigured && !forecastVisualFixturesActive ? (
            <p className="future-empty">
              Демонстрационный режим: общественное рассмотрение доступно в
              подключённой версии.
            </p>
          ) : state === "loading" ? (
            <p role="status">Загружаем темы…</p>
          ) : state === "error" ? (
            <div className="future-error" role="alert">
              <p>Не удалось загрузить темы для рассмотрения.</p>
              <button onClick={() => void load()}>
                Повторить загрузку тем
              </button>
            </div>
          ) : items.length ? (
            items.map((proposal) => (
              <ForecastProposalCard
                key={proposal.id}
                proposal={proposal}
                busy={pendingIds.has(proposal.id)}
                error={errors[proposal.id]}
                onVote={(vote) => void voting(proposal.id, vote)}
              />
            ))
          ) : (
            <p className="future-empty">
              Пока нет тем, открытых для общественного рассмотрения
            </p>
          )}
        </section>
        <section
          aria-labelledby="experimental-forecast-title"
          data-testid="experimental-forecast"
        >
          <h2 id="experimental-forecast-title">
            Пример экспериментального прогноза
          </h2>
          <p>
            Здесь можно проверить механику личной вероятности, дедлайна, исхода
            и математической оценки одного прогноза.
          </p>
          <CurrentForecastExample />
        </section>
      </div>
    </ProductShell>
  );
}
