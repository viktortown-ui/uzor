# QA checklist

- Открыть 360px ширину: нет горизонтальной прокрутки.
- В demo mode виден бейдж «ДЕМО — данные вымышлены».
- Добавление нити проходит за 4 шага и показывает «Вплести в УЗОР».
- Production без env показывает спокойный экран настройки, а не фальшивые цифры.
- `/about`, `/branch/:id`, `/curator`, `/join` открываются.
- Проверки: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

## `/wrapped` личный недельный отчёт
- [ ] Demo mode: `/wrapped` открывается без Supabase и показывает неоновый dashboard с Ранним наблюдателем, Транспортом, 23 сигналами, 14 подтверждениями, 62% точности, 1 ранним сигналом и серией 3 недели.
- [ ] Desktop: sidebar + dashboard grid без поломки существующей навигации.
- [ ] Mobile 360px: нет горизонтального скролла, карточки идут в одну колонку.
- [ ] Production: `/wrapped` вызывает RPC `get_my_wrapped_report` и не показывает raw contributions других пользователей.
- [ ] Production без сессии/круга: спокойный экран «Войдите в закрытый круг» с переходом на `/join`.
- [ ] Production без migration 004: понятное сообщение про `004_weekly_wrapped_rpc.sql`.
- [ ] Empty state: при отсутствии вкладов за неделю показывается CTA «Добавить сигнал» на `/contribute`.

## Wrapped QA hotfix 005
- [ ] Проверить `/wrapped` desktop: sidebar с иконками, top controls, hero, donut, line chart, top themes, right signals, progress/XP и metric cards.
- [ ] Проверить `/wrapped` на mobile 360px: нет горизонтального скролла, критичные тексты видны, кнопки не вылезают.
- [ ] Проверить empty state блока “Где вы были правы”: текст про независимое подтверждение и CTA `/contribute`.
- [ ] Проверить confirmed logic в production: один пользователь не подтверждает сам себя; две разные учётки на одной ветке дают `participants >= 2`, `summary.confirmedSignals` и `rightSignals` согласованы.


## Delta Map MVP `/map`
- [ ] Карта открывается без картографического токена; при ошибке загрузки основы показывается локальный retry-state.
- [ ] Карта загружается после настройки token.
- [ ] Карта центрируется на Перми.
- [ ] Поиск места работает по району, улице или месту.
- [ ] Фильтры direction/status/category перезагружают viewport.
- [ ] Empty viewport показывает текст без CTA на старый constructor.
- [ ] Marker click открывает карточку.
- [ ] Positive и negative визуально различаются.
- [ ] Видны все четыре публичных статуса: new/checking/confirmed/fork.
- [ ] Confirm обновляет счётчики, статус и marker без reload.
- [ ] Disconfirm обновляет счётчики, статус и marker без reload.
- [ ] Fork показывает понятное сообщение.
- [ ] Mobile открывает карточку как bottom sheet.
- [ ] Browser geolocation запрашивается только после явного клика.
- [ ] Production не использует demo data.
- [ ] Missing migration 006 показывает понятный state.

## Delta Create Stage 3.3 manual QA

- Positive: заполнить `/contribute`, получить «Дельта опубликована» и прогресс 1/3 или 1/4.
- Negative: вызвать ошибку публикации и убедиться, что draft и координаты сохранены.
- Click map: выбрать точку кликом, проверить label и координаты.
- Geolocation: проверить кнопку определения текущего места, если браузер разрешает.
- Categories: загрузка, ошибка и повтор через «Повторить».
- Similar empty: увидеть «Похожих Дельт рядом не найдено» и кнопку публикации.
- Similar found: увидеть до пяти карточек похожих Дельт.
- Confirm existing: выбрать «Это то же изменение» и проверить `reactToDelta(confirm)`.
- Create separate: выбрать «Создать отдельную», увидеть confirmation dialog.
- Confirmation dialog: только «Да, опубликовать отдельно» публикует новую Дельту.
- 1/3: проверить progress для обычной категории.
- 1/4: проверить progress для чувствительной категории, если backend вернул target 4.
- Author locked: убедиться, что показан текст «Это ваша Дельта» без raw code.
- Publication error: проверить retry, возврат к проверке и изменение Дельты.
- Share: проверить Web Share API.
- Clipboard fallback: отключить Web Share и проверить копирование ссылки.
- Open on map: открыть result → «Показать на карте» → `/map?delta=id`.
- Mobile: проверить одну колонку, sticky actions и отсутствие горизонтального scroll.
- Draft restore: перезагрузить незавершённый production draft.
- Draft cleanup: после success localStorage `uzor_delta_create_v1` удалён.
- Demo separation: demo не пишет в production Supabase.
- Old contribute archive: `/lab/old-contribute` показывает «Архивный прототип».
