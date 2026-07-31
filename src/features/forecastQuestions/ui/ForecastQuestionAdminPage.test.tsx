import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorProposal } from "../api/forecastQuestionApiTypes";

const api = vi.hoisted(() => ({
  getEditorAccess: vi.fn(),
  getEditorQueue: vi.fn(),
  moderateProposal: vi.fn(),
}));
vi.mock("../api/forecastQuestionApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/forecastQuestionApi")>()),
  ...api,
}));
import {
  ForecastQuestionAdminPage,
  getInitialEditorFilter,
} from "./ForecastQuestionAdminPage";

const proposal = (
  suffix: string,
  status: EditorProposal["status"],
  title: string,
): EditorProposal => ({
  id: `10000000-0000-4000-8000-00000000000${suffix}`,
  authorUserId: `20000000-0000-4000-8000-00000000000${suffix}`,
  rawQuestion: `Вопрос ${suffix}`,
  whyItMatters: `Причина ${suffix}`,
  publicTitle: title,
  publicSummary: `Описание ${suffix}`,
  publicDecisionNote: `Заметка ${suffix}`,
  status,
  createdAt: "2026-08-01T07:00:00Z",
  updatedAt: "2026-08-02T07:00:00Z",
  linkedDeltaId: `30000000-0000-4000-8000-00000000000${suffix}`,
  suggestedOptions: ["Да", "Нет"],
  supportCount: 0,
  notNowCount: 0,
  totalVotes: 0,
});
const renderPage = () =>
  render(
    <MemoryRouter>
      <ForecastQuestionAdminPage />
    </MemoryRouter>,
  );
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  api.getEditorAccess.mockResolvedValue({
    authenticated: true,
    authorized: true,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ForecastQuestionAdminPage queue integrity", () => {
  it("согласует визуальный фильтр со статусом публичного рассмотрения", () => {
    expect(getInitialEditorFilter(true, "public_review")).toBe("public_review");
    expect(getInitialEditorFilter(false, "public_review")).toBe("submitted");
  });
  it("clears stale selection after a failed filter load and never submits its fields for the retry result", async () => {
    const a = proposal("1", "submitted", "Заголовок A");
    const b = proposal("2", "in_review", "Заголовок B");
    api.getEditorQueue
      .mockResolvedValueOnce([a])
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce([b])
      .mockResolvedValueOnce([b]);
    api.moderateProposal.mockResolvedValue(b);
    renderPage();
    expect(await screen.findByDisplayValue("Заголовок A")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Публичный заголовок"));
    await userEvent.type(
      screen.getByLabelText("Публичный заголовок"),
      "Несохранённый текст A",
    );
    await userEvent.click(screen.getByRole("button", { name: "В работе" }));
    expect(
      await screen.findByText("Не удалось загрузить редакторскую очередь."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Вопрос 1")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Взять в работу" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByDisplayValue("Заголовок B")).toBeInTheDocument();
    expect(screen.getByLabelText("Публичное описание")).toHaveValue(
      "Описание 2",
    );
    expect(screen.getByLabelText("Решение редактора")).toHaveValue("Заметка 2");
    await userEvent.click(
      screen.getByRole("button", { name: "Открыть рассмотрение" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(api.moderateProposal).toHaveBeenCalled());
    expect(api.moderateProposal).toHaveBeenCalledWith(
      b.id,
      "open_public_review",
      "Заголовок B",
      "Описание 2",
      "Заметка 2",
    );
    expect(JSON.stringify(api.moderateProposal.mock.calls)).not.toContain(
      "Несохранённый текст A",
    );
  });
});

describe("ForecastQuestionAdminPage access semantics", () => {
  it("keeps access checking inside ProductShell without queue controls", () => {
    api.getEditorAccess.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Проверяем доступ…");
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Новые" }),
    ).not.toBeInTheDocument();
  });

  it("distinguishes an authorization denial from a request failure", async () => {
    api.getEditorAccess.mockResolvedValue({
      authenticated: true,
      authorized: false,
    });
    renderPage();
    expect(
      await screen.findByText("Нет доступа к редакторской очереди"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Не удалось проверить права редактора"),
    ).not.toBeInTheDocument();
  });

  it("retries a technical access failure and loads the authorized queue", async () => {
    api.getEditorAccess
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ authenticated: true, authorized: true });
    api.getEditorQueue.mockResolvedValueOnce([]);
    renderPage();
    expect(
      await screen.findByText("Не удалось проверить права редактора"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Нет доступа к редакторской очереди"),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Повторить проверку доступа" }),
    );
    expect(
      await screen.findByText("В этой очереди пока нет предложений."),
    ).toBeInTheDocument();
    expect(api.getEditorAccess).toHaveBeenCalledTimes(2);
  });

  it("does not expose raw author or Delta identifiers in the editor workspace", async () => {
    api.getEditorAccess.mockResolvedValue({ authorized: true });
    api.getEditorQueue.mockResolvedValue([proposal("1", "submitted", "")]);
    renderPage();
    expect(await screen.findByText("Автор предложения: участник городского пространства")).toBeInTheDocument();
    expect(screen.getByText("Связана с Дельтой")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(proposal("1", "submitted", "").authorUserId);
    expect(document.body).not.toHaveTextContent(proposal("1", "submitted", "").linkedDeltaId!);
  });
});
