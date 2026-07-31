import { describe, expect, it } from "vitest";
import { forecastVisualFixturesEnabled } from "./visualFixtures";
describe("forecast visual fixtures gate", () => {
  it("keeps fixtures disabled unless VITE_VISUAL_TEST_MODE is exactly true", () => {
    expect(import.meta.env.VITE_VISUAL_TEST_MODE).not.toBe("true");
    expect(forecastVisualFixturesEnabled).toBe(false);
  });
});
