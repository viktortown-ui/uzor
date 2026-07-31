import type {
  ConsiderationVote,
  PublicProposal,
} from "../api/forecastQuestionApiTypes";
export type ProposalCardMode = "interactive" | "preview" | "selected";
export function ForecastProposalCard({
  proposal,
  mode = proposal.status === "selected" ? "selected" : "interactive",
  onVote,
  busy = false,
  error,
}: {
  proposal: PublicProposal;
  mode?: ProposalCardMode;
  onVote?: (vote: ConsiderationVote) => void;
  busy?: boolean;
  error?: string;
}) {
  const selected = mode === "selected";
  return (
    <article className={`future-card future-card--${mode}`}>
      <p className="future-badge">
        {mode === "preview"
          ? "ПРЕДПРОСМОТР ПУБЛИЧНОЙ КАРТОЧКИ"
          : selected
            ? "ВЫБРАНО ДЛЯ ПОДГОТОВКИ"
            : "РАССМОТРЕНИЕ ТЕМЫ · НЕ ПРОГНОЗ"}
      </p>
      <h3>{proposal.publicTitle}</h3>
      <p>{proposal.publicSummary}</p>
      {proposal.locationLabel && <p>📍 {proposal.locationLabel}</p>}
      <p>
        Голосов: {proposal.totalVotes} · стоит рассмотреть:{" "}
        {proposal.supportCount} · не сейчас: {proposal.notNowCount}
      </p>
      {selected ? (
        <p>
          Редактор готовит проверяемую формулировку, варианты исхода, срок и
          источник проверки.
        </p>
      ) : (
        <>
          <p>Это выбор темы для подготовки, а не прогноз события.</p>
          {mode === "interactive" && (
            <div className="future-votes">
              <button
                disabled={busy}
                aria-pressed={proposal.viewerVote === "support"}
                onClick={() => onVote?.("support")}
              >
                Да, стоит рассмотреть
              </button>
              <button
                disabled={busy}
                aria-pressed={proposal.viewerVote === "not_now"}
                onClick={() => onVote?.("not_now")}
              >
                Нет, не сейчас
              </button>
            </div>
          )}
          <small>
            Результат помогает редактору определить приоритет, но не публикует
            прогноз автоматически.
          </small>
        </>
      )}
      {error && (
        <p className="future-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
