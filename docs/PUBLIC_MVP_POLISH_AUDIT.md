# Аудит публичного MVP после migration 011

## Базовая линия

- Стартовый commit: `dfc52016200afa2924e842ef8466032457998d01`.
- Ветка до работы: локальная `work`; remote в предоставленном checkout не настроен, поэтому обновить знание `main` через fetch невозможно.
- `npm ci`: 702 пакета; npm сообщил о 20 известных уязвимостях транзитивных зависимостей (2 low, 18 high), массовое обновление не выполнялось.
- Базовые `lint` и `typecheck` прошли.
- Vitest: 59 файлов, 599 тестов — все прошли. Единственное stderr-сообщение воспроизводится намеренным production-тестом отсутствующего Wrapped RPC.
- Live URL `https://viktortown-ui.github.io/uzor/` и GitHub Issues проверены через HTTP 200 31.07.2026.
- Базовые bundle/precache показатели фиксируются выводом двух production-сборок и bundle-проверок в PR.

## Проблемы и исправления

| Severity | Маршрут / состояние | Обнаружено | Исправление | Проверка |
|---|---|---|---|---|
| High | Все `/forecast*` | badge не соответствовал точному `EXPERIMENTAL`, часть прямых маршрутов не имела badge | точная маркировка добавлена каждому экрану, включая очередь и фиксацию исхода | unit, visual fixtures, ручной поиск строк |
| High | `/forecast/propose` success | UI показывал сырой UUID предложения | идентификатор скрыт, показан понятный следующий шаг | unit/typecheck |
| Medium | `/forecast` | главным заголовком было «Будущее города» | «Вопросы о будущем», три действия разведены в тексте | visual/unit |
| Medium | `/settings` | отсутствовали feedback, честный PWA status, placeholders и completion announcement | добавлены проверенный Issues-канал, состояния установки, `Скоро`, точное описание очистки и live status | Settings test, keyboard review |
| Medium | `/about`, onboarding/settings guide | определения будущего были неполными и дублировались | единый `ProductGuide` и справочник терминов; добавлены процесс, privacy, FAQ и простое объяснение Brier | unit/visual |
| Medium | README | содержал стек, RPC, migrations и команды | полностью переписан как русская продуктовая страница | editorial review |
| Low | motion | не было общего безопасного fallback для reduced motion в guide/settings | добавлена reduced-motion media query | CSS review |

## Маршруты и viewports

Проверены production-маршруты `/auth`, `/about`, `/wrapped`, `/pulse`, `/map`, `/contribute`, `/forecast`, `/forecast/propose`, `/forecast/mine`, `/forecast/admin/questions`, `/forecast/resolve`, `/settings` и поддерживаемые legacy/lab entry points. Детерминированный visual runner охватывает будущие вопросы; geometry runner проверяет shell/map на заданной матрице размеров. Снимки не считаются доказательством поведения физического устройства.

Проверяемые состояния: loading, empty, recoverable error, auth/access gate, proposal success, public consideration, editor filters/access, resolver access/result, PWA install/update/offline notices, dialogs and onboarding.

## Accessibility и ручная клавиатурная проверка

- Последовательность Tab и видимый focus проверены для auth, navigation, proposal form, Settings и dialog.
- Dialog очистки использует `role=dialog`, `aria-modal`, label/description, focus trap, Escape и восстановление focus.
- Status/error announcements используют `role=status` / `role=alert`.
- Основные dock targets имеют минимум 44 CSS px; native form semantics сохранены.
- Reduced motion не отключает информацию и сокращает transitions/animations.

## MapLibre

Карта сохраняет один экземпляр MapLibre. Контейнер управляет resize через `ResizeObserver`; вызовы коалесцируются одним `requestAnimationFrame`, visual viewport listeners очищаются. Flex/grid ancestors используют `min-width: 0` и fullscreen `dvh`; `invalidateSize()`/Leaflet отсутствуют. Recoverable resize не переводит карту в fatal state; ошибки style/init остаются отдельными.

## Визуальные артефакты

Детерминированные снимки интерфейса были успешно созданы проверками `npm run test:geometry` и `npm run test:forecast-question-visuals`. Они остаются доступными как runtime-/CI-артефакты в игнорируемом Git каталоге `artifacts/`; генераторы, проверки геометрии и визуальные сценарии сохранены без ослабления.

PNG-файлы намеренно исключены из этого change set, чтобы текстовый diff был совместим с созданием PR через Codex. Это не означает сбой визуальной проверки: тесты завершились успешно, а результаты были просмотрены как артефакты. Добавление отобранных продуктовых снимков в галерею README остаётся отдельным post-PR шагом через GitHub.

## Реальные устройства — ещё требуется

### iPhone Safari
- Add to Home Screen и standalone launch;
- safe areas, dock и экранная клавиатура;
- portrait/landscape map resize, browser background/return;
- update guidance, cached-shell offline launch.

### Android Chrome
- native install prompt and installed launch;
- collapsing address bar and keyboard;
- orientation/map resize;
- update prompt, offline launch and reconnection.

Физические устройства в этой среде не предоставлены. Автоматизированные Chromium/WebKit/Firefox результаты нельзя выдавать за physical-device validation.

## Финальный статус

Backend migrations, RPC/RLS и scoring contracts не менялись. Незавершённые physical-device проверки и npm audit findings являются известными ограничениями; они не скрываются утверждением «все устройства протестированы».
