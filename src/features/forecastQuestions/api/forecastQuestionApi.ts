import { getSupabaseClient } from "../../../lib/supabase/client";
import {
  proposalStatuses,
  type ConsiderationVote,
  type EditorProposal,
  type ModerationAction,
  type MyProposal,
  type PublicProposal,
  type SubmitProposalInput,
} from "./forecastQuestionApiTypes";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const messages: Record<string, string> = {
  not_authenticated: "Необходимо войти в аккаунт.",
  anonymous_identity: "Гостевой аккаунт не может выполнить это действие.",
  not_circle_member: "Нет доступа к пространству города.",
  invalid_linked_delta: "Связанная Дельта недоступна.",
  too_many_options: "Можно предложить не больше шести вариантов.",
  duplicate_options: "Удалите повторяющиеся варианты.",
  invalid_vote: "Выберите доступный вариант рассмотрения.",
  voting_closed: "Рассмотрение этой темы уже завершено.",
  proposal_not_found: "Предложение не найдено.",
  editor_not_authorized: "Нет доступа к редакторской очереди.",
  invalid_transition:
    "Это редакторское действие недоступно для текущего статуса.",
  public_content_required: "Для публикации нужны заголовок и описание.",
  decision_note_required: "Добавьте пояснение редактора.",
  invalid_response: "Сервер вернул некорректные данные.",
};
export class ForecastQuestionApiError extends Error {
  constructor(
    public code: string,
    public userMessage = messages[code] ??
      "Не удалось выполнить действие. Попробуйте ещё раз.",
  ) {
    super(code);
  }
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ForecastQuestionApiError("invalid_response");
  return value as Record<string, unknown>;
};
const string = (value: unknown, max = 2000) => {
  if (typeof value !== "string" || value.length > max)
    throw new ForecastQuestionApiError("invalid_response");
  return value;
};
const uuid = (value: unknown) => {
  const valueString = string(value, 36);
  if (!UUID.test(valueString))
    throw new ForecastQuestionApiError("invalid_response");
  return valueString;
};
const date = (value: unknown) => {
  const valueString = string(value, 40);
  if (!Number.isFinite(Date.parse(valueString)))
    throw new ForecastQuestionApiError("invalid_response");
  return new Date(valueString).toISOString();
};
const nullable = <T>(value: unknown, map: (input: unknown) => T) =>
  value == null ? undefined : map(value);
const array = (value: unknown) => {
  if (!Array.isArray(value))
    throw new ForecastQuestionApiError("invalid_response");
  return value;
};
const count = (value: unknown) => {
  if (
    !Number.isInteger(value) ||
    Number(value) < 0 ||
    Number(value) > 2_147_483_647
  )
    throw new ForecastQuestionApiError("invalid_response");
  return Number(value);
};
const status = (value: unknown): MyProposal["status"] => {
  const candidate = string(value, 30);
  if (!proposalStatuses.includes(candidate as MyProposal["status"]))
    throw new ForecastQuestionApiError("invalid_response");
  return candidate as MyProposal["status"];
};
const vote = (value: unknown): ConsiderationVote => {
  if (value !== "support" && value !== "not_now")
    throw new ForecastQuestionApiError("invalid_response");
  return value;
};
const parseCounts = (row: Record<string, unknown>) => {
  const supportCount = count(row.supportCount);
  const notNowCount = count(row.notNowCount);
  const totalVotes = count(row.totalVotes);
  if (supportCount + notNowCount !== totalVotes)
    throw new ForecastQuestionApiError("invalid_response");
  return { supportCount, notNowCount, totalVotes };
};
const parseError = (error: unknown) => {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  const code =
    Object.keys(messages).find((key) => raw.includes(key)) ?? "unknown";
  return new ForecastQuestionApiError(code);
};

function parseMyProposal(value: unknown): MyProposal {
  const row = object(value);
  const suggestedOptions = array(row.suggestedOptions).map((option) =>
    string(option, 120),
  );
  if (suggestedOptions.length > 6)
    throw new ForecastQuestionApiError("invalid_response");
  return {
    id: uuid(row.id),
    rawQuestion: string(row.rawQuestion, 280),
    publicTitle: nullable(row.publicTitle, (value) => string(value, 280)),
    publicSummary: nullable(row.publicSummary, (value) => string(value, 800)),
    status: status(row.status),
    publicDecisionNote: nullable(row.publicDecisionNote, (value) =>
      string(value, 1000),
    ),
    createdAt: date(row.createdAt),
    updatedAt: date(row.updatedAt),
    linkedDeltaId: nullable(row.linkedDeltaId, uuid),
    suggestedDeadline: nullable(row.suggestedDeadline, date),
    suggestedOptions,
  };
}
function parsePublicProposal(value: unknown): PublicProposal {
  const row = object(value);
  const proposalStatus = status(row.status);
  if (proposalStatus !== "public_review" && proposalStatus !== "selected")
    throw new ForecastQuestionApiError("invalid_response");
  return {
    id: uuid(row.id),
    publicTitle: string(row.publicTitle, 280),
    publicSummary: string(row.publicSummary, 800),
    locationLabel: nullable(row.locationLabel, (value) => string(value, 160)),
    linkedDeltaId: nullable(row.linkedDeltaId, uuid),
    status: proposalStatus,
    publicReviewStartedAt: nullable(row.publicReviewStartedAt, date),
    ...parseCounts(row),
    viewerVote: nullable(row.viewerVote, vote),
    createdAt: date(row.createdAt),
    selectedAt: nullable(row.selectedAt, date),
  };
}
function parseEditorProposal(value: unknown): EditorProposal {
  const row = object(value);
  return {
    ...parseMyProposal(value),
    authorUserId: uuid(row.authorUserId),
    whyItMatters: nullable(row.whyItMatters, (value) => string(value, 800)),
    locationLabel: nullable(row.locationLabel, (value) => string(value, 160)),
    suggestedSourceReference: nullable(row.suggestedSourceReference, (value) =>
      string(value, 2000),
    ),
    reviewedAt: nullable(row.reviewedAt, date),
    publicReviewStartedAt: nullable(row.publicReviewStartedAt, date),
    selectedAt: nullable(row.selectedAt, date),
    ...parseCounts(row),
  };
}
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await getSupabaseClient().rpc(name, args);
  if (error) throw parseError(error);
  return data;
}
export async function submitProposal(input: SubmitProposalInput) {
  const options = input.suggestedOptions
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    input.rawQuestion.trim().length < 10 ||
    input.rawQuestion.trim().length > 280
  )
    throw new ForecastQuestionApiError(
      "invalid_question",
      "Вопрос должен содержать от 10 до 280 символов.",
    );
  if (options.length > 6)
    throw new ForecastQuestionApiError("too_many_options");
  if (options.some((option) => option.length > 120))
    throw new ForecastQuestionApiError(
      "invalid_options",
      "Каждый вариант должен быть не длиннее 120 символов.",
    );
  if (
    new Set(options.map((value) => value.toLocaleLowerCase("ru"))).size !==
    options.length
  )
    throw new ForecastQuestionApiError("duplicate_options");
  return parseMyProposal(
    await rpc("submit_forecast_question_proposal", {
      input_city_slug: input.citySlug,
      input_raw_question: input.rawQuestion,
      input_why_it_matters: input.whyItMatters ?? null,
      input_location_label: input.locationLabel ?? null,
      input_linked_delta_id: input.linkedDeltaId ?? null,
      input_suggested_options: options,
      input_suggested_source_reference: input.suggestedSourceReference ?? null,
      input_suggested_deadline: input.suggestedDeadline ?? null,
    }),
  );
}
export async function listPublicProposals() {
  return array(
    await rpc("list_public_forecast_question_proposals", {
      input_city_slug: "perm",
      input_limit: 30,
      input_offset: 0,
    }),
  ).map(parsePublicProposal);
}
export async function getMyProposals() {
  return array(
    await rpc("get_my_forecast_question_proposals", {
      input_city_slug: "perm",
      input_limit: 30,
    }),
  ).map(parseMyProposal);
}
export async function castVote(id: string, selectedVote: ConsiderationVote) {
  const row = object(
    await rpc("vote_forecast_question_consideration", {
      input_proposal_id: id,
      input_vote: selectedVote,
    }),
  );
  return { ...parseCounts(row), viewerVote: vote(row.viewerVote) };
}
export async function getEditorAccess() {
  const row = object(await rpc("get_forecast_question_editor_access", {}));
  if (
    typeof row.authenticated !== "boolean" ||
    typeof row.authorized !== "boolean"
  )
    throw new ForecastQuestionApiError("invalid_response");
  return { authenticated: row.authenticated, authorized: row.authorized };
}
export async function getEditorQueue(filter?: string) {
  return array(
    await rpc("get_forecast_question_editor_queue", {
      input_status: filter ?? null,
      input_limit: 100,
    }),
  ).map(parseEditorProposal);
}
export async function moderateProposal(
  id: string,
  action: ModerationAction,
  title?: string,
  summary?: string,
  note?: string,
) {
  return parseEditorProposal(
    await rpc("moderate_forecast_question_proposal", {
      input_proposal_id: id,
      input_action: action,
      input_public_title: title ?? null,
      input_public_summary: summary ?? null,
      input_public_decision_note: note ?? null,
    }),
  );
}

export const forecastQuestionValidation = {
  parseMyProposal,
  parsePublicProposal,
  parseEditorProposal,
};
