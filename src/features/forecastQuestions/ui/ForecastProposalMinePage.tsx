import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isProductionConfigured } from "../../../app/appMode";
import { ProductShell } from "../../../app/ProductShell";
import { getMyProposals } from "../api/forecastQuestionApi";
import type { MyProposal } from "../api/forecastQuestionApiTypes";
import "./forecastQuestions.css";
import {
  forecastVisualFixturesActive,
  visualMyProposals,
} from "./visualFixtures";
const labels: Record<MyProposal["status"], string> = {
  submitted: "Получено редакцией",
  in_review: "Редактор изучает",
  needs_clarification: "Нужно уточнение",
  public_review: "Открыто для общественного рассмотрения",
  selected: "Выбрано для подготовки",
  converted: "Создан экспериментальный проверяемый вопрос",
  rejected: "Не принято",
  archived: "Архивировано",
};
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export function ForecastProposalMinePage() {
  const [items, setItems] = useState<MyProposal[]>(
    forecastVisualFixturesActive ? visualMyProposals : [],
  );
  const [state, setState] = useState<"loading" | "loaded" | "error">(
    isProductionConfigured && !forecastVisualFixturesActive
      ? "loading"
      : "loaded",
  );
  const load = useCallback(async () => {
    if (!isProductionConfigured || forecastVisualFixturesActive) return;
    setState("loading");
    try {
      setItems(await getMyProposals());
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  return (
    <ProductShell className="future-shell">
      <div className="future-page">
        <Link to="/forecast">← Будущее</Link>
        <h1>Мои предложения</h1>
        {!isProductionConfigured && !forecastVisualFixturesActive ? (
          <p className="future-empty">
            История предложений доступна в подключённой версии УЗОРА.
          </p>
        ) : state === "loading" ? (
          <p role="status">Загружаем предложения…</p>
        ) : state === "error" ? (
          <div className="future-error" role="alert">
            <p>Не удалось загрузить ваши предложения.</p>
            <button onClick={() => void load()}>Повторить</button>
          </div>
        ) : items.length ? (
          items.map((proposal) => (
            <article className="future-card" key={proposal.id}>
              <p className="future-badge">{labels[proposal.status]}</p>
              <h2>{proposal.rawQuestion}</h2>
              {proposal.publicTitle && (
                <p>
                  <b>Редакционный заголовок:</b> {proposal.publicTitle}
                </p>
              )}
              {proposal.publicDecisionNote && (
                <p>{proposal.publicDecisionNote}</p>
              )}
              <p>
                Создано: {formatDate(proposal.createdAt)} · обновлено:{" "}
                {formatDate(proposal.updatedAt)}
              </p>
              {proposal.suggestedDeadline && (
                <p>
                  Предложенный срок: {formatDate(proposal.suggestedDeadline)}
                </p>
              )}
              {proposal.suggestedOptions.length > 0 && (
                <p>
                  Предложенные варианты: {proposal.suggestedOptions.join(" · ")}
                </p>
              )}
              {proposal.status === "needs_clarification" && (
                <>
                  <p>Редактору нужны дополнительные сведения.</p>
                  <small>
                    Возможность ответить на уточнение появится позже.
                  </small>
                </>
              )}
            </article>
          ))
        ) : (
          <p className="future-empty">Вы ещё не предлагали вопросы.</p>
        )}
      </div>
    </ProductShell>
  );
}
