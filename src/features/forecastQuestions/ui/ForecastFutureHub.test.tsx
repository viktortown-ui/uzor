import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicProposal } from "../api/forecastQuestionApiTypes";
const api = vi.hoisted(() => ({
  listPublicProposals: vi.fn(),
  castVote: vi.fn(),
}));
vi.mock("../../../app/appMode", () => ({ isProductionConfigured: true }));
vi.mock("../api/forecastQuestionApi", () => api);
vi.mock("../../forecasting/ui/CurrentForecastExample", () => ({
  CurrentForecastExample: () => (
    <article aria-label="Экспериментальный проверяемый прогноз">
      Личная вероятность
    </article>
  ),
}));
import { ForecastFutureHub } from "./ForecastFutureHub";
const proposal = (
  suffix: string,
  status: PublicProposal["status"] = "public_review",
): PublicProposal => ({
  id: `10000000-0000-4000-8000-00000000000${suffix}`,
  publicTitle: `Тема ${suffix}`,
  publicSummary: `Описание ${suffix}`,
  status,
  supportCount: 1,
  notNowCount: 0,
  totalVotes: 1,
  createdAt: "2026-08-01T00:00:00Z",
});
const renderHub = () =>
  render(
    <MemoryRouter>
      <ForecastFutureHub />
    </MemoryRouter>,
  );
beforeEach(() =>
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  }),
);
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("ForecastFutureHub production states", () => {
  it("renders named independent regions and an empty state", async () => {
    api.listPublicProposals.mockResolvedValue([]);
    renderHub();
    expect(screen.getByText("Загружаем темы…")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Пока нет тем, открытых для общественного рассмотрения",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Стоит рассмотреть" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "Пример экспериментального прогноза",
      }),
    ).toBeInTheDocument();
  });
  it("renders public-review and selected proposals", async () => {
    api.listPublicProposals.mockResolvedValue([
      proposal("1"),
      proposal("2", "selected"),
    ]);
    renderHub();
    expect(await screen.findByText("Тема 1")).toBeInTheDocument();
    expect(screen.getByText("ВЫБРАНО ДЛЯ ПОДГОТОВКИ")).toBeInTheDocument();
  });
  it("retries a failed list request", async () => {
    api.listPublicProposals
      .mockRejectedValueOnce(new Error())
      .mockResolvedValueOnce([]);
    renderHub();
    await screen.findByText("Не удалось загрузить темы для рассмотрения.");
    await userEvent.click(
      screen.getByRole("button", { name: "Повторить загрузку тем" }),
    );
    expect(
      await screen.findByText(
        "Пока нет тем, открытых для общественного рассмотрения",
      ),
    ).toBeInTheDocument();
    expect(api.listPublicProposals).toHaveBeenCalledTimes(2);
  });
  it("locks only the pending proposal and preserves counters after a separate failure", async () => {
    const a = proposal("1"),
      b = proposal("2");
    api.listPublicProposals.mockResolvedValue([a, b]);
    let resolveVote!: (value: unknown) => void;
    api.castVote
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveVote = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error());
    renderHub();
    const cardA = (await screen.findByText("Тема 1")).closest("article")!;
    const cardB = screen.getByText("Тема 2").closest("article")!;
    await userEvent.click(
      within(cardA).getByRole("button", { name: "Да, стоит рассмотреть" }),
    );
    expect(
      within(cardA).getByRole("button", { name: "Да, стоит рассмотреть" }),
    ).toBeDisabled();
    expect(
      within(cardB).getByRole("button", { name: "Нет, не сейчас" }),
    ).toBeEnabled();
    await userEvent.click(
      within(cardB).getByRole("button", { name: "Нет, не сейчас" }),
    );
    expect(
      await within(cardB).findByText(
        "Не удалось сохранить выбор. Попробуйте ещё раз.",
      ),
    ).toBeInTheDocument();
    expect(within(cardB).getByText(/Голосов: 1/)).toBeInTheDocument();
    resolveVote({
      supportCount: 2,
      notNowCount: 0,
      totalVotes: 2,
      viewerVote: "support",
    });
    await waitFor(() =>
      expect(within(cardA).getByText(/Голосов: 2/)).toBeInTheDocument(),
    );
    expect(api.castVote).toHaveBeenCalledTimes(2);
  });
});
