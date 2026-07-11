# Delta Create Stage 3.3

Production `/contribute` теперь открывает четырёхшаговый конструктор Дельты: место, изменение, контекст и проверка. Общий geo-flow переиспользуется для production и `/lab/delta-create-geo`, но write-действия включены только в production.

## Production flow

1. Пользователь выбирает точку MapLibre/OpenFreeMap в Перми.
2. Заполняет направление, категорию, тип изменения, subject и statement.
3. Добавляет период, уровень влияния и детали.
4. На проверке выполняется поиск похожих Дельт через `find_similar_deltas` с радиусом 1000 м и периодом 14 дней.

Категории в production загружаются через `loadDeltaCategories()`. Circle context берётся через `loadDeltaMapContext()` и не сохраняется в draft.

## Create separate

Если похожих Дельт нет, поиск пропущен после ошибки или пользователь подтверждает, что изменение отдельное, вызывается `createDelta()` / RPC `create_delta`. Перед отправкой draft валидируется, тексты trim-ятся, координаты передаются как реальные `lat/lng`, а `citySlug` остаётся `perm`.

## Confirm existing

Если пользователь выбирает «Это то же изменение», production вызывает `reactToDelta(deltaId, 'confirm')` / RPC `react_to_delta`. Новая Дельта при этом не создаётся.

## Immediate result

После успешного RPC показывается result-state: statement, направление, категория, место, статус, `confirmCount`, `disconfirmCount`, `confirmationTarget`, прогресс и effect-copy backend. Для новой Дельты показывается «Дельта опубликована», для подтверждения — «Вы подтвердили Дельту».

## LocalStorage draft

Production использует отдельный ключ `uzor_delta_create_v1`. В нём хранится только draft формы: шаги, место, координаты, категориальные поля, текст и решение по похожим. `circleId`, user/session/token и RPC result не сохраняются. После успеха draft удаляется, после ошибки сохраняется.

## Share

Share доступен только после успеха. URL строится от текущего origin/base path и ведёт на `#/map?delta=<id>`. Payload не содержит координаты, circleId, userId или технические поля. Используются `navigator.share`, затем clipboard, затем textarea fallback.

## `/map?delta`

Карта читает query `delta`, вызывает `getDeltaCard(deltaId)` и открывает `DeltaMapCard`. Если marker есть в viewport, он может быть подсвечен текущей логикой; если marker не загружен, карточка всё равно открывается без раскрытия скрытых координат и без нового RPC.

## Demo separation

В demo mode production constructor показывает демо-бейдж и создаёт локальный result без записи в Supabase. Lab routes остаются read-only: core lab хранит только черновик, geo lab ищет похожие и явно сообщает, что публикации нет.

## Error states

Технические Supabase/PostgREST/SQL сообщения мапятся в понятные тексты: вход в круг, отсутствие membership, недоступная категория, координаты, payload, missing migration/RPC, author locked и unknown.

## Old contribute archive

Старый contribution-flow сохранён на `/lab/old-contribute` с бейджем «Архивный прототип». Production `/contribute` больше не использует `catalog_items` и старые preset-кнопки.

## RPC

Используются существующие RPC из migration 006: `create_delta`, `react_to_delta`, `find_similar_deltas`, `get_delta_card`. Новая migration не требуется.

## Пока не реализовано

- Realtime.
- Curator Delta moderation.
- Notifications.
- Wrapped на Delta-данных.
- Geocoder/address autocomplete.
