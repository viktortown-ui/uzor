import type {
  EditorProposal,
  MyProposal,
  PublicProposal,
} from "../api/forecastQuestionApiTypes";
export const forecastVisualFixturesEnabled =
  import.meta.env.VITE_VISUAL_TEST_MODE === "true";
export const forecastVisualFixturesActive =
  forecastVisualFixturesEnabled &&
  !window.location.hash.includes("visualDemo=true");
const createdAt = "2026-07-20T08:00:00.000Z";
export const visualPublicProposals: PublicProposal[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    publicTitle: "Откроют ли движение по мосту до сентября?",
    publicSummary:
      "Редакция уточняет срок, источник проверки и границы события. Сейчас жители выбирают только приоритет темы.",
    locationLabel: "Камский мост",
    status: "public_review",
    publicReviewStartedAt: createdAt,
    supportCount: 18,
    notNowCount: 4,
    totalVotes: 22,
    viewerVote: "support",
    createdAt,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    publicTitle: "Закончат ли благоустройство набережной этой осенью?",
    publicSummary:
      "Тема о доступности прогулочного маршрута; это ещё не формальный прогноз результата.",
    locationLabel: "Набережная Камы",
    status: "public_review",
    publicReviewStartedAt: createdAt,
    supportCount: 11,
    notNowCount: 3,
    totalVotes: 14,
    createdAt,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    publicTitle: "Запустят ли новый вечерний маршрут до декабря?",
    publicSummary:
      "Редактор готовит точную формулировку, срок и проверяемый источник.",
    locationLabel: "Индустриальный район",
    status: "selected",
    supportCount: 26,
    notNowCount: 5,
    totalVotes: 31,
    createdAt,
    selectedAt: "2026-07-25T09:00:00.000Z",
  },
];
export const visualMyProposals: MyProposal[] = [
  {
    id: "10000000-0000-4000-8000-000000000011",
    rawQuestion: "Когда закончат ремонт лестницы к набережной?",
    publicTitle: "Завершат ли ремонт лестницы до октября?",
    status: "public_review",
    createdAt,
    updatedAt: "2026-07-24T10:00:00.000Z",
    suggestedDeadline: "2026-10-01T00:00:00.000Z",
    suggestedOptions: ["Завершат", "Не завершат"],
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    rawQuestion: "Появится ли освещение у остановки?",
    status: "needs_clarification",
    publicDecisionNote: "Уточните название остановки и источник проверки.",
    createdAt,
    updatedAt: "2026-07-23T11:00:00.000Z",
    suggestedOptions: [],
  },
  {
    id: "10000000-0000-4000-8000-000000000013",
    rawQuestion: "Откроют ли велодорожку в этом году?",
    publicTitle: "Откроют ли участок велодорожки до 31 декабря?",
    status: "selected",
    createdAt,
    updatedAt: "2026-07-26T12:00:00.000Z",
    suggestedOptions: ["Да", "Нет"],
  },
];
export const visualEditorProposal: EditorProposal = {
  ...visualMyProposals[0],
  authorUserId: "20000000-0000-4000-8000-000000000001",
  whyItMatters: "Лестница связывает жилой квартал с набережной.",
  locationLabel: "Монастырская улица",
  linkedDeltaId: "30000000-0000-4000-8000-000000000001",
  suggestedSourceReference: "Публичный график городских работ",
  reviewedAt: "2026-07-22T08:00:00.000Z",
  publicReviewStartedAt: createdAt,
  supportCount: 18,
  notNowCount: 4,
  totalVotes: 22,
};
