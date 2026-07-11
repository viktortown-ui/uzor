# Delta Create Stage 3.2 — география и похожие Дельты

Цель этапа — лабораторный маршрут `/lab/delta-create-geo`, который переиспользует ядро этапа 3.1, но заменяет mock-выбор района реальным выбором места и добавляет проверку похожих Дельт перед будущей публикацией.

## Выбор места

Пользователь выбирает место в Перми тремя способами: SearchBox Mapbox, кликом по встроенной компактной карте или кнопкой «Моё местоположение». Геолокация запрашивается только по явному клику. Район остаётся необязательным уточнением и не заменяет координаты.

## Mapbox token, SearchBox и карта

Используются существующие `VITE_MAPBOX_ACCESS_TOKEN` и `VITE_MAPBOX_STYLE_URL`. Если token отсутствует, geo-route показывает setup-state и не подставляет fake production coordinates. SearchBox настроен на русский язык, RU, proximity центра Перми и поиск адресов, улиц, мест и POI. Карта встроена в форму и ставит один marker по выбранной точке.

## Приватность координат

Точные координаты сохраняются только в отдельном draft `uzor_delta_create_geo_v1` и используются на frontend для RPC поиска похожих Дельт. В интерфейсе не показываются числовые lat/lng. Публичное округление координат остаётся серверной ответственностью.

## Поиск похожих

На шаге 4 показывается summary, затем выполняется `findSimilarDeltas` через существующий Delta API. Запрос соответствует ST_DWithin RPC-сценарию: `citySlug = perm`, `radiusM = 1000`, `days = 14`, категория, направление, тип изменения и настоящие координаты. `circleId` берётся через существующий `loadDeltaMapContext()` и не сохраняется в localStorage.

## Решение existing/separate

Если похожие Дельты найдены, пользователь выбирает «Это то же изменение» или подтверждает «Создать отдельную». На этапе 3.2 выбор записывается только локально в draft как `selectedSimilarDeltaId` и `similarDecision`.

## Почему пока нет записи

`reactToDelta` не вызывается: подтверждение существующей Дельты будет подключено на этапе 3.3. `createDelta` не вызывается: отдельная Дельта ещё не публикуется, пользователь только готовит черновик.

## Demo/production separation

В demo mode используются учебные точки и локальный поиск по `demoDeltaMapData`; production Supabase не вызывается. Production никогда не использует demo-точки как выбранные координаты.

## Этап 3.3

Следующий этап подключит фактическую публикацию через `createDelta` и отправку отклика по существующей Дельте через `reactToDelta`, сохранив проверку похожих и privacy-модель.

## QA checklist

- token exists;
- token missing;
- SearchBox;
- map click;
- geolocation allow;
- geolocation deny;
- location privacy text;
- categories;
- similar empty;
- similar found;
- existing decision;
- separate decision;
- search error;
- retry;
- continue without check;
- mobile;
- draft restore;
- production `/contribute` unchanged.
