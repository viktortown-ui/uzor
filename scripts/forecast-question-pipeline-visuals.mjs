/* global process, URL, document, console, window */
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = resolve(process.cwd(), "dist");
const artifacts = resolve(
  process.cwd(),
  "artifacts/forecast-question-pipeline-visuals",
);
const mime = new Map([
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".css", "text/css"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".webmanifest", "application/manifest+json"],
]);
const server = createServer(async (request, response) => {
  const pathname =
    new URL(request.url ?? "/", "http://localhost").pathname.replace(
      /^\/uzor\/?/,
      "",
    ) || "index.html";
  const file = resolve(root, pathname);
  if (!file.startsWith(root + sep) && file !== root)
    return response.writeHead(404).end();
  try {
    const body = await readFile(file);
    response
      .writeHead(200, {
        "content-type": mime.get(extname(file)) ?? "application/octet-stream",
      })
      .end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}/uzor/`;
const browser = await chromium.launch();
await mkdir(artifacts, { recursive: true });
const cases = [
  { name: "future-hub-demo-desktop", route: "/forecast?visualDemo=true", viewport: { width: 1440, height: 900 }, text: "Вопросы о будущем" },
  { name: "future-hub-demo-mobile-top", route: "/forecast?visualDemo=true", viewport: { width: 390, height: 844 }, text: "Вопросы о будущем", target: "h1" },
  { name: "public-consideration-desktop", route: "/forecast", viewport: { width: 1440, height: 900 }, text: "РАССМОТРЕНИЕ ТЕМЫ · НЕ ПРОГНОЗ", target: ".future-card--interactive" },
  { name: "public-consideration-mobile-top", route: "/forecast", viewport: { width: 390, height: 844 }, text: "Да, стоит рассмотреть", target: ".future-card--interactive" },
  { name: "selected-proposal-desktop", route: "/forecast", viewport: { width: 1440, height: 900 }, text: "ВЫБРАНО ДЛЯ ПОДГОТОВКИ", target: ".future-card--selected" },
  { name: "selected-proposal-mobile", route: "/forecast", viewport: { width: 390, height: 844 }, text: "ВЫБРАНО ДЛЯ ПОДГОТОВКИ", target: ".future-card--selected" },
  { name: "experimental-forecast-mobile-top", route: "/forecast", viewport: { width: 390, height: 844 }, text: "Пример экспериментального прогноза", target: "[data-testid=experimental-forecast] h2" },
  { name: "experimental-forecast-mobile-bottom", route: "/forecast", viewport: { width: 390, height: 844 }, text: "Почему вы так думаете?", target: "article[aria-label='Экспериментальный проверяемый прогноз'] .forecast-reasoning textarea", fullyVisible: true },
  { name: "proposal-form-desktop", route: "/forecast/propose", viewport: { width: 1440, height: 900 }, text: "Что о будущем города стоит обсудить?" },
  { name: "proposal-form-mobile-top", route: "/forecast/propose", viewport: { width: 390, height: 844 }, text: "Что о будущем города стоит обсудить?", target: "textarea" },
  { name: "proposal-form-mobile-submit", route: "/forecast/propose", viewport: { width: 390, height: 844 }, text: "Отправить редакции", target: "button[type=submit]" },
  { name: "my-proposals-desktop", route: "/forecast/mine", viewport: { width: 1440, height: 900 }, text: "Открыто для общественного рассмотрения" },
  { name: "my-proposals-mobile-top", route: "/forecast/mine", viewport: { width: 390, height: 844 }, text: "Открыто для общественного рассмотрения", target: ".future-card" },
  { name: "my-proposals-mobile-bottom", route: "/forecast/mine", viewport: { width: 390, height: 844 }, text: "Выбрано для подготовки", target: ".future-card:last-of-type" },
  { name: "editor-queue-desktop", route: "/forecast/admin/questions", viewport: { width: 1440, height: 900 }, text: "На рассмотрении", target: ".admin-filters button[aria-pressed=true]" },
  { name: "editor-preview-desktop", route: "/forecast/admin/questions", viewport: { width: 1280, height: 900 }, text: "Предпросмотр публичной карточки", target: ".admin-grid aside" },
  { name: "editor-queue-below-1100", route: "/forecast/admin/questions", viewport: { width: 900, height: 900 }, text: "Выбрать для подготовки", target: ".admin-actions" },
];

async function dockOverlap(page) {
  return page.evaluate(() => {
    const dock = document.querySelector(".mobile-app-dock");
    if (!dock) return null;
    const dockRect = dock.getBoundingClientRect();
    const scroller = document.querySelector(".mobile-app-main");
    const scrollRect = scroller?.getBoundingClientRect();
    const node = [...document.querySelectorAll(".future-page h1,.future-page h2,.future-page h3,.future-page button,.future-page input,.future-page textarea,.future-card")].find((item) => {
      const rect = item.getBoundingClientRect();
      const top = scrollRect ? Math.max(rect.top, scrollRect.top) : rect.top;
      const bottom = scrollRect ? Math.min(rect.bottom, scrollRect.bottom) : rect.bottom;
      return bottom > top && bottom > dockRect.top && top < dockRect.bottom;
    });
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { tagName: node.tagName, className: node.className, text: node.textContent?.trim().slice(0, 120), elementRect: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }, dockRect: { top: dockRect.top, right: dockRect.right, bottom: dockRect.bottom, left: dockRect.left } };
  });
}

try {
  for (const visualCase of cases) {
    const context = await browser.newContext({ viewport: visualCase.viewport, serviceWorkers: "block" });
    const page = await context.newPage();
    await page.goto(`${origin}#${visualCase.route}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1 }).waitFor();
    const target = visualCase.target ? page.locator(visualCase.target).first() : null;
    if (target) {
      await target.waitFor();
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
    }
    const namedText = page.getByText(visualCase.text, { exact: false }).first();
    await namedText.waitFor();
    if (!(await namedText.isVisible())) throw new Error(`${visualCase.name}: named state text is not visible: ${visualCase.text}`);
    const namedBounds = await namedText.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const scrollRect = document.querySelector(".mobile-app-main")?.getBoundingClientRect();
      const dockRect = document.querySelector(".mobile-app-dock")?.getBoundingClientRect();
      const visibleTop = scrollRect?.top ?? 0;
      const visibleBottom = Math.min(scrollRect?.bottom ?? window.innerHeight, dockRect?.top ?? window.innerHeight);
      return {
        intersects: rect.bottom > visibleTop && rect.top < visibleBottom,
        fullyVisible: rect.top >= visibleTop && rect.bottom <= visibleBottom,
        dockClearance: dockRect ? dockRect.top - rect.bottom : null,
        rect: { top: rect.top, bottom: rect.bottom },
        scrollRect: scrollRect ? { top: scrollRect.top, bottom: scrollRect.bottom } : null,
      };
    });
    if (!namedBounds.intersects || (visualCase.fullyVisible && (!namedBounds.fullyVisible || (namedBounds.dockClearance ?? 12) < 12))) {
      throw new Error(`${visualCase.name}: named content is outside its captured viewport: ${JSON.stringify(namedBounds)}`);
    }
    if (visualCase.fullyVisible && target) {
      const targetBounds = await target.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const scrollRect = document.querySelector(".mobile-app-main")?.getBoundingClientRect();
        const dockRect = document.querySelector(".mobile-app-dock")?.getBoundingClientRect();
        return {
          fullyVisible: !scrollRect || (rect.top >= scrollRect.top && rect.bottom <= scrollRect.bottom),
          dockClearance: dockRect ? dockRect.top - rect.bottom : null,
          rect: { top: rect.top, bottom: rect.bottom },
          scrollRect: scrollRect ? { top: scrollRect.top, bottom: scrollRect.bottom } : null,
        };
      });
      if (!targetBounds.fullyVisible || (targetBounds.dockClearance ?? 12) < 12) {
        throw new Error(`${visualCase.name}: bottom control is not fully dock-safe: ${JSON.stringify(targetBounds)}`);
      }
    }
    if (visualCase.name === "public-consideration-mobile-top") {
      for (const label of ["Да, стоит рассмотреть", "Нет, не сейчас"]) {
        if (!(await page.getByRole("button", { name: label }).first().isVisible())) throw new Error(`${visualCase.name}: missing visible control ${label}`);
      }
    }
    const contract = await page.evaluate(() => ({
      h1: document.querySelectorAll("h1").length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      clipped: (() => {
        const node = [...document.querySelectorAll(".future-page button,.future-page a")].find(
          (item) => item.scrollWidth > item.clientWidth + 2,
        );
        return node
          ? { tag: node.tagName, className: node.className, text: node.textContent?.trim().slice(0, 120), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }
          : null;
      })(),
      voteTargets: [...document.querySelectorAll(".future-votes button")].every((node) => node.getBoundingClientRect().height >= 44),
      headerSpacing: (() => { const link = document.querySelector(".future-form-header > a"); const badge = document.querySelector(".future-form-header > .future-badge"); return !link || !badge || link.getBoundingClientRect().bottom < badge.getBoundingClientRect().top; })(),
    }));
    const overlap = await dockOverlap(page);
    if (contract.h1 !== 1 || contract.overflow || contract.clipped || !contract.voteTargets || !contract.headerSpacing || overlap) throw new Error(`${visualCase.name} visual contract failed: ${JSON.stringify({ ...contract, dockOverlap: overlap })}`);
    if (visualCase.viewport.width <= 900) {
      const metrics = await page.locator(".mobile-app-main").evaluate((node) => ({ scrollHeight: node.scrollHeight, clientHeight: node.clientHeight }));
      if (metrics.scrollHeight <= metrics.clientHeight && visualCase.target) throw new Error(`${visualCase.name}: expected dock-safe inner scroller`);
    }
    await page.screenshot({ path: resolve(artifacts, `${visualCase.name}.png`) });
    await context.close();
  }
  console.log(`Forecast question pipeline visuals: ${cases.length} screenshots captured.`);
} finally {
  await browser.close();
  server.close();
}
