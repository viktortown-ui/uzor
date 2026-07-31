/* global process, URL, document, console, innerHeight */
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
  [
    "future-hub-demo-desktop",
    "/forecast?visualDemo=true",
    { width: 1440, height: 900 },
  ],
  [
    "future-hub-demo-mobile",
    "/forecast?visualDemo=true",
    { width: 390, height: 844 },
  ],
  ["public-consideration-desktop", "/forecast", { width: 1440, height: 900 }],
  ["public-consideration-mobile", "/forecast", { width: 390, height: 844 }],
  ["selected-proposal-desktop", "/forecast", { width: 1440, height: 900 }],
  ["proposal-form-desktop", "/forecast/propose", { width: 1440, height: 900 }],
  ["proposal-form-mobile", "/forecast/propose", { width: 390, height: 844 }],
  ["my-proposals-desktop", "/forecast/mine", { width: 1440, height: 900 }],
  ["my-proposals-mobile", "/forecast/mine", { width: 390, height: 844 }],
  [
    "editor-queue-desktop",
    "/forecast/admin/questions",
    { width: 1440, height: 900 },
  ],
  [
    "editor-preview-desktop",
    "/forecast/admin/questions",
    { width: 1280, height: 900 },
  ],
  [
    "editor-queue-mobile",
    "/forecast/admin/questions",
    { width: 900, height: 900 },
  ],
];
try {
  for (const [name, route, viewport] of cases) {
    const context = await browser.newContext({
      viewport,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    await page.goto(`${origin}#${route}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1 }).waitFor();
    const contract = await page.evaluate(() => ({
      h1: document.querySelectorAll("h1").length,
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      clipped: (() => {
        const node = [
          ...document.querySelectorAll(".future-page button,.future-page a"),
        ].find((item) => item.scrollWidth > item.clientWidth + 2);
        return node
          ? {
              tagName: node.tagName,
              className: node.className,
              text: node.textContent?.trim().slice(0, 120),
              scrollWidth: node.scrollWidth,
              clientWidth: node.clientWidth,
            }
          : null;
      })(),
      voteTargets: [...document.querySelectorAll(".future-votes button")].every(
        (node) => node.getBoundingClientRect().height >= 44,
      ),
      headerSpacing: (() => {
        const link = document.querySelector(".future-form-header > a");
        const badge = document.querySelector(
          ".future-form-header > .future-badge",
        );
        if (!link || !badge) return true;
        return (
          link.getBoundingClientRect().bottom <
          badge.getBoundingClientRect().top
        );
      })(),
      dockOverlap: (() => {
        const dock = document.querySelector(".mobile-app-dock");
        if (!dock) return false;
        const dockRect = dock.getBoundingClientRect();
        const scrollContainer = document.querySelector(".mobile-app-main");
        const scrollRect = scrollContainer?.getBoundingClientRect();
        const overlapping = [
          ...document.querySelectorAll(
            ".future-page h1,.future-page h2,.future-page h3,.future-page button,.future-page input,.future-page textarea,.future-card",
          ),
        ].find((node) => {
          const rect = node.getBoundingClientRect();
          const visible = rect.bottom > 0 && rect.top < innerHeight;
          const visibleBottom = scrollRect
            ? Math.min(rect.bottom, scrollRect.bottom)
            : rect.bottom;
          const visibleTop = scrollRect
            ? Math.max(rect.top, scrollRect.top)
            : rect.top;
          return (
            visible &&
            visibleBottom > dockRect.top &&
            visibleTop < dockRect.bottom
          );
        });
        if (!overlapping) return null;
        const rect = overlapping.getBoundingClientRect();
        return {
          tagName: overlapping.tagName,
          className: overlapping.className,
          text: overlapping.textContent?.trim().slice(0, 120),
          elementRect: {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
          },
          dockRect: {
            top: dockRect.top,
            right: dockRect.right,
            bottom: dockRect.bottom,
            left: dockRect.left,
          },
        };
      })(),
    }));
    if (
      contract.h1 !== 1 ||
      contract.overflow ||
      contract.clipped ||
      !contract.voteTargets ||
      !contract.headerSpacing ||
      Boolean(contract.dockOverlap)
    )
      throw new Error(
        `${route} visual contract failed: ${JSON.stringify(contract)}`,
      );
    const mobileMain = page.locator(".mobile-app-main");
    if (viewport.width <= 900 && (await mobileMain.count())) {
      const scrollMetrics = await mobileMain.evaluate((node) => ({
        scrollHeight: node.scrollHeight,
        clientHeight: node.clientHeight,
      }));
      if (scrollMetrics.scrollHeight > scrollMetrics.clientHeight) {
        await mobileMain.evaluate((node) => {
          node.scrollTop = node.scrollHeight;
        });
        await page.waitForTimeout(100);
        const bottomOverlap = await page.evaluate(() => {
          const dock = document.querySelector(".mobile-app-dock");
          if (!dock) return false;
          const dockRect = dock.getBoundingClientRect();
          const scrollRect = document
            .querySelector(".mobile-app-main")
            ?.getBoundingClientRect();
          return [
            ...document.querySelectorAll(
              ".future-page h1,.future-page h2,.future-page h3,.future-page button,.future-page input,.future-page textarea,.future-card",
            ),
          ].some((node) => {
            const rect = node.getBoundingClientRect();
            const visibleBottom = scrollRect
              ? Math.min(rect.bottom, scrollRect.bottom)
              : rect.bottom;
            const visibleTop = scrollRect
              ? Math.max(rect.top, scrollRect.top)
              : rect.top;
            return (
              rect.bottom > 0 &&
              rect.top < innerHeight &&
              visibleBottom > dockRect.top &&
              visibleTop < dockRect.bottom
            );
          });
        });
        if (bottomOverlap)
          throw new Error(
            `${route} dock overlap after scrolling inner mobile content`,
          );
      }
    }
    await page.screenshot({
      path: resolve(artifacts, `${name}.png`),
      fullPage: true,
    });
    await context.close();
  }
  console.log(
    `Forecast question pipeline visuals: ${cases.length} screenshots captured.`,
  );
} finally {
  await browser.close();
  server.close();
}
