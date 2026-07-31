import { useCallback, useEffect, useState } from "react";
import { ProductShell } from "../../../app/ProductShell";
import {
  ForecastQuestionApiError,
  getEditorAccess,
  getEditorQueue,
  moderateProposal,
} from "../api/forecastQuestionApi";
import type {
  EditorProposal,
  ModerationAction,
  ProposalStatus,
} from "../api/forecastQuestionApiTypes";
import { ForecastProposalCard } from "./ForecastProposalCard";
import "./forecastQuestions.css";
import {
  forecastVisualFixturesActive,
  visualEditorProposal,
} from "./visualFixtures";
const filters: readonly [ProposalStatus, string][] = [
  ["submitted", "Новые"],
  ["in_review", "В работе"],
  ["needs_clarification", "Нужно уточнение"],
  ["public_review", "На рассмотрении"],
  ["selected", "Выбраны"],
  ["rejected", "Отклонённые"],
  ["archived", "Архив"],
];
const formatOptionalDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "не указано";
const actions: Record<ProposalStatus, readonly [ModerationAction, string][]> = {
  submitted: [["start_review", "Взять в работу"]],
  in_review: [
    ["request_clarification", "Запросить уточнение"],
    ["open_public_review", "Открыть рассмотрение"],
    ["reject", "Отклонить"],
    ["archive", "Архивировать"],
  ],
  needs_clarification: [
    ["return_to_review", "Вернуть в работу"],
    ["reject", "Отклонить"],
    ["archive", "Архивировать"],
  ],
  public_review: [
    ["select", "Выбрать для подготовки"],
    ["return_to_review", "Вернуть в работу"],
    ["archive", "Архивировать"],
  ],
  selected: [
    ["return_to_review", "Вернуть в работу"],
    ["archive", "Архивировать"],
  ],
  rejected: [],
  archived: [],
  converted: [],
};
export function ForecastQuestionAdminPage() {
  const [accessState, setAccessState] = useState<
    "checking" | "authorized" | "unauthorized" | "error"
  >(forecastVisualFixturesActive ? "authorized" : "checking");
  const [filter, setFilter] = useState<ProposalStatus>("submitted");
  const [items, setItems] = useState<EditorProposal[]>(
    forecastVisualFixturesActive ? [visualEditorProposal] : [],
  );
  const [selected, setSelected] = useState<EditorProposal | undefined>(
    forecastVisualFixturesActive ? visualEditorProposal : undefined,
  );
  const [title, setTitle] = useState(
    forecastVisualFixturesActive
      ? (visualEditorProposal.publicTitle ?? visualEditorProposal.rawQuestion)
      : "",
  );
  const [summary, setSummary] = useState(
    forecastVisualFixturesActive
      ? (visualEditorProposal.publicSummary ??
          visualEditorProposal.whyItMatters ??
          "")
      : "",
  );
  const [note, setNote] = useState(
    forecastVisualFixturesActive
      ? (visualEditorProposal.publicDecisionNote ?? "")
      : "",
  );
  const [pending, setPending] = useState<ModerationAction>();
  const [loading, setLoading] = useState(!forecastVisualFixturesActive);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");
  const choose = useCallback((proposal?: EditorProposal) => {
    setSelected(proposal);
    setTitle(proposal?.publicTitle ?? proposal?.rawQuestion ?? "");
    setSummary(proposal?.publicSummary ?? proposal?.whyItMatters ?? "");
    setNote(proposal?.publicDecisionNote ?? "");
    setPending(undefined);
  }, []);
  const load = useCallback(
    async (nextFilter: ProposalStatus) => {
      setLoading(true);
      setError("");
      setItems([]);
      choose(undefined);
      try {
        const queue = await getEditorQueue(nextFilter);
        setItems(queue);
        choose(queue[0]);
      } catch {
        setError("Не удалось загрузить редакторскую очередь.");
      } finally {
        setLoading(false);
      }
    },
    [choose],
  );
  const checkAccess = useCallback(async () => {
    if (forecastVisualFixturesActive) return;
    setAccessState("checking");
    setLoading(true);
    try {
      const access = await getEditorAccess();
      if (!access.authorized) {
        setAccessState("unauthorized");
        setLoading(false);
        return;
      }
      setAccessState("authorized");
      await load("submitted");
    } catch {
      setAccessState("error");
      setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    queueMicrotask(() => void checkAccess());
  }, [checkAccess]);
  const changeFilter = (nextFilter: ProposalStatus) => {
    setFilter(nextFilter);
    void load(nextFilter);
  };
  const moderate = async () => {
    if (!selected || !pending || mutating) return;
    setMutating(true);
    setError("");
    try {
      await moderateProposal(selected.id, pending, title, summary, note);
      await load(filter);
    } catch (mutationError) {
      setError(
        mutationError instanceof ForecastQuestionApiError
          ? mutationError.userMessage
          : "Не удалось применить редакторское решение. Попробуйте ещё раз.",
      );
    } finally {
      setMutating(false);
      setPending(undefined);
    }
  };
  return (
    <ProductShell className="future-shell">
      <div className="future-page">
        <h1>Редакторская очередь вопросов</h1>
        <p>
          Редакторская очередь относится к экспериментальному разделу «Будущее».
          Публикация темы не делает её официальным прогнозом.
        </p>
        {accessState === "checking" ? (
          <p role="status">Проверяем доступ…</p>
        ) : accessState === "unauthorized" ? (
          <p role="alert">Нет доступа к редакторской очереди</p>
        ) : accessState === "error" ? (
          <div className="future-error" role="alert">
            <p>Не удалось проверить права редактора</p>
            <button onClick={() => void checkAccess()}>
              Повторить проверку доступа
            </button>
          </div>
        ) : (
          <>
            <nav className="admin-filters">
              {filters.map(([status, label]) => (
                <button
                  disabled={loading || mutating}
                  key={status}
                  onClick={() => changeFilter(status)}
                  aria-pressed={filter === status}
                >
                  {label}
                </button>
              ))}
            </nav>
            {error && (
              <div className="future-error" role="alert">
                <p>{error}</p>
                <button onClick={() => void load(filter)}>Повторить</button>
              </div>
            )}
            {loading ? (
              <p role="status">Загружаем очередь…</p>
            ) : items.length === 0 ? (
              <p className="future-empty">
                В этой очереди пока нет предложений.
              </p>
            ) : (
              <div className="admin-grid">
                <section aria-label="Очередь">
                  {items.map((proposal) => (
                    <button
                      className="admin-item"
                      aria-pressed={selected?.id === proposal.id}
                      key={proposal.id}
                      onClick={() => choose(proposal)}
                    >
                      {proposal.rawQuestion}
                    </button>
                  ))}
                </section>
                {selected && (
                  <section>
                    <h2>Исходное предложение</h2>
                    <p>{selected.rawQuestion}</p>
                    <p>{selected.whyItMatters}</p>
                    <dl className="admin-context">
                      <div>
                        <dt>Место</dt>
                        <dd>{selected.locationLabel || "не указано"}</dd>
                      </div>
                      <div>
                        <dt>Предложенный срок</dt>
                        <dd>
                          {formatOptionalDate(selected.suggestedDeadline)}
                        </dd>
                      </div>
                      <div>
                        <dt>Источник проверки</dt>
                        <dd>
                          {selected.suggestedSourceReference || "не указан"}
                        </dd>
                      </div>
                      <div>
                        <dt>Создано</dt>
                        <dd>{formatOptionalDate(selected.createdAt)}</dd>
                      </div>
                      <div>
                        <dt>Обновлено</dt>
                        <dd>{formatOptionalDate(selected.updatedAt)}</dd>
                      </div>
                      <div>
                        <dt>Изучено</dt>
                        <dd>{formatOptionalDate(selected.reviewedAt)}</dd>
                      </div>
                      <div>
                        <dt>Рассмотрение открыто</dt>
                        <dd>
                          {formatOptionalDate(selected.publicReviewStartedAt)}
                        </dd>
                      </div>
                      <div>
                        <dt>Выбрано</dt>
                        <dd>{formatOptionalDate(selected.selectedAt)}</dd>
                      </div>
                    </dl>
                    <p className="admin-technical">
                      Автор: {selected.authorUserId} · связанная Дельта:{" "}
                      {selected.linkedDeltaId || "нет"}
                    </p>
                    <p>
                      Варианты: {selected.suggestedOptions.join(" · ") || "нет"}
                    </p>
                    <p>
                      Активность: {selected.supportCount} за ·{" "}
                      {selected.notNowCount} не сейчас · голосов:{" "}
                      {selected.totalVotes}
                    </p>
                    <label>
                      Публичный заголовок
                      <input
                        disabled={mutating}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    </label>
                    <label>
                      Публичное описание
                      <textarea
                        disabled={mutating}
                        value={summary}
                        onChange={(event) => setSummary(event.target.value)}
                      />
                    </label>
                    <label>
                      Решение редактора
                      <textarea
                        disabled={mutating}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                      />
                    </label>
                    <div className="admin-actions">
                      {actions[selected.status].map(([action, label]) => (
                        <button
                          disabled={mutating}
                          onClick={() => setPending(action)}
                          key={action}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {pending && (
                      <div className="admin-confirmation" role="alertdialog">
                        <p>
                          Проверьте редакционные поля и подтвердите действие.
                        </p>
                        <button
                          disabled={mutating}
                          onClick={() => void moderate()}
                        >
                          {mutating ? "Сохраняем…" : "Подтвердить"}
                        </button>
                        <button
                          disabled={mutating}
                          onClick={() => setPending(undefined)}
                        >
                          Отмена
                        </button>
                      </div>
                    )}
                  </section>
                )}
                <aside>
                  <h2>Предпросмотр публичной карточки</h2>
                  {selected && title && summary && (
                    <ForecastProposalCard
                      mode="preview"
                      proposal={{
                        id: selected.id,
                        publicTitle: title,
                        publicSummary: summary,
                        status: "public_review",
                        supportCount: selected.supportCount,
                        notNowCount: selected.notNowCount,
                        totalVotes: selected.totalVotes,
                        createdAt: selected.createdAt,
                      }}
                    />
                  )}
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </ProductShell>
  );
}
