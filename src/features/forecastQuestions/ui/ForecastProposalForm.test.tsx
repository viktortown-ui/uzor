import { describe, expect, it } from "vitest";
import { permLocalDateTimeToIso } from "./ForecastProposalForm";
describe("Perm deadline conversion", () => {
  it("converts Perm local time using the explicit UTC+05 offset", () => {
    expect(permLocalDateTimeToIso("2026-09-01T12:30")).toBe(
      "2026-09-01T07:30:00.000Z",
    );
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach } from "vitest";
import { ForecastProposalForm } from "./ForecastProposalForm";
afterEach(cleanup);
it("shows an honest demo-only state without an active form", () => {
  render(
    <MemoryRouter>
      <ForecastProposalForm />
    </MemoryRouter>,
  );
  expect(
    screen.getByText(
      "Отправка предложений доступна в подключённой версии УЗОРА",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Отправить редакции" }),
  ).not.toBeInTheDocument();
});
