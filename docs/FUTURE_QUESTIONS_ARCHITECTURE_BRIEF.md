# Вопросы о будущем: архитектурный brief следующего этапа

> Только проектирование. Документ не меняет текущие таблицы, RPC, RLS, scoring или UI. Любая реализация требует отдельного решения владельца.

## Центральный агрегат и границы доменов

Центральный агрегат — **`FutureQuestion`**. Прогноз не корневой объект, а ответ участника на конкретную неизменяемую версию вопроса.

- **Observation** фиксирует уже замеченное; **Expectation** — ненумерованное ожидание.
- **Future Question** задаёт проверяемую неопределённость, окно и правила исхода.
- **Forecast Submission** хранит вероятность/ответ участника на snapshot версии.
- **Outcome Resolution** фиксирует авторитетный результат и доказательство.
- **Score** оценивает один ответ; **Calibration** описывает соответствие вероятностей частотам на достаточной выборке.
- **Reputation** — не единое число и не производная одного результата; если появится, остаётся набором независимых измерений.

## Жизненный цикл

Предлагаемые состояния: `draft → submitted → editorial_review → clarification_required → public_consideration → selected_for_preparation → formalization → scheduled → open → closed → awaiting_outcome → resolved → archived`. Отдельные терминальные ветви: `cancelled`, `void_ambiguous`, `rejected`, затем `archived`.

Автор создаёт draft, отправляет и отвечает на clarification. Редактор принимает в review, просит уточнение, открывает consideration, выбирает/отклоняет, формализует и планирует. Публичные участники дают advisory votes только в consideration. Система открывает/закрывает по серверному времени. Авторизованный resolver фиксирует исход; конфликт/неоднозначность требует второго review и может завершиться `void_ambiguous`. Архивирование выполняет редактор по политике хранения. Ни голосование, ни порог голосов не публикуют вопрос автоматически.

## Версии и неизменяемость

До публичных голосов редактор может править draft с журналом. После появления голосов смысловое изменение создаёт новую версию и не переносит старые голоса; прежний snapshot сохраняется. После первого прогноза wording, outcomes, deadline и resolution criteria неизменяемы. Существенная ошибка требует cancellation/void и нового вопроса, а не скрытой правки. Cosmetic correction получает отдельную diff-запись и не меняет смысл.

Каждый vote/forecast ссылается на `question_version_id`. Любая явная миграция ответов допускается только для доказуемо несмысловой правки, с audit event. Ответы никогда не приписываются изменённой формулировке молча.

## Шаблон формального вопроса

Snapshot содержит: точный заголовок, контекст, категорию, географию, opening/closing time, ожидаемое время разрешения, допустимые outcomes, resolution criteria, основной и резервный источник, что учитывается и не учитывается, условия cancellation, обработку ambiguity и номер версии.

### Checklist качества

Одна проверяемая неопределённость; никаких несвязанных утверждений; заголовок соответствует критериям; результат наблюдаем/измеряем; дата или окно явны; источник явен; нет неопределённых субъективных слов, скрытых зависимостей и ретроспективного переосмысления.

## Универсальные типы — не для реализации сейчас

Архитектура должна допускать binary, mutually-exclusive categorical, numeric, date/time и bounded range/distribution. Conditional question — поздний advanced type с явно зафиксированным условием. Нельзя сводить каждый тип к binary UI или одному payload.

## Scoring

Binary probability допускает Brier Score `(p − o)²`; mutually exclusive categorical — сумму/нормированное расширение по всем outcome. Brier нельзя механически применять к непрерывным значениям или датам: для них позднее оцениваются CRPS, interval score либо заранее выбранная proper scoring rule.

Scoring выполняется сервером по immutable forecast/outcome snapshots. Запись содержит algorithm id/version, inputs, timestamp и ссылку на resolution. Смена алгоритма не переписывает историю; сравнения используют прозрачные baselines (например, 50% или историческая частота) и одинаковую версию.

## Calibration

Calibration отвечает: среди прогнозов около 70% происходило ли событие примерно в 70% случаев. Один-два исхода недостаточны. Нужны probability buckets, reliability diagram, sample size и uncertainty для каждого bucket, заранее заданный минимальный объём. Accuracy и confidence показываются отдельно; отсутствие данных — полноценное состояние, а не «плохая калибровка».

## Reputation по слоям

Если владелец одобрит будущий reputation, измерения остаются раздельными: forecasting accuracy, calibration, author quality, editorial quality, resolution reliability и observation contribution. Нельзя складывать деятельность участника в универсальный балл или публично выводить текущую частную оценку как репутацию.

## Представление неопределённости

Всегда показывать sample size, disagreement и insufficient-data. Для агрегатов — подходящий uncertainty interval, волатильность и дату snapshot; округлять без ложной точности. Community expectation визуально и текстово отделять от verified fact. Не скрывать малую выборку за уверенной диаграммой.

## История и прозрачность

Хранить immutable question snapshots, изменения вероятности и revision history участника, close-time snapshot, outcome source и explanation, score-version history, а также записи cancellation/ambiguity. Публичная история не должна раскрывать частную личность или частные прогнозы; редакционный audit требует отдельной авторизации.

## Модерация и злоупотребления

Политика охватывает duplicates, манипулятивные формулировки, спорные темы, частные персональные данные, вопросы об индивидуальном вреде/смерти, coordinated voting, conflicts of interest и editor recusal. Для sources нужны критерии надёжности и fallback. Решения предусматривают appeal/review, неизменяемую причину и разделение автора, редактора и resolver там, где конфликт существенен.

## Граница MVP

Текущий MVP сохраняет существующую binary-механику, proposal consideration, ручную редактуру, verified outcome и private personal score. Этот brief не разрешает менять её контракты.

## Отложено

Новые типы вопросов, агрегаты сообщества, calibration dashboards, reputation, appeals workflow, public histories, conditional questions и новые scoring families.

## Ключевые риски

Ложная точность, смена смысла после голосов, недостаточная выборка, утечка частных ответов, конфликт интересов resolver/editor, слабый источник, манипулятивная формулировка и смешение consideration с forecast.

## Решения, требующие явного одобрения владельца до кода

Схема и миграции; RLS/RPC/API; публичность прогнозов и агрегатов; ownership ролей; thresholds и lifecycle transitions; типы вопросов; scoring/calibration; правила invalidation; moderation/appeal; retention; любые reputation-механики и тексты юридической политики.
