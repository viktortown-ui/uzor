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
- [ ] Missing Mapbox token показывает setup-state и приложение не падает.
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
