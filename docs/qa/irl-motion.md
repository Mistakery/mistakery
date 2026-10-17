# IRL «Удар и посадка»

Владелец выбрал вариант1. Обычная новая IRL-карточка появляется с полным текстом и коротким импульсом одновременно с существующим P1: scale .985→1, y3→0. Семплированная затухающая пружина650/42/1 доходит до порога остановки за175ms. Opacity карточки всегда1. При реальном входе из non-IRL дополнительно проявляется сцена за180ms.

Fresh padel event использует существующий `soundEvents` snapshot. Back/rerender не повторяют вход; новый принятый выбор после Back снова получает импульс. Карточки с `outcomeTone` пропускают обычный эффект и сохраняют исходные success/failure эффекты. Выбор, расходы, RNG, locks, звуковые образцы и messenger pacing не изменены.

Reduced motion пропускает новые transform/fade. Ввод, смена сцены, rerender, Back, resize, hidden и изменение reduced-motion отменяют движение. `will-change` очищается после завершения/отмены; отменённая анимация не снимает слой у новой анимации той же сцены.

## Проверки 2026-10-11

- TDD: до изменения runtime —8 tests,6 passed,2 failed; оба no-preference браузера воспроизвели отсутствующую обычную анимацию. После изменения —8/8 passed в Chromium/WebKit.
- `node --test --test-concurrency=3 tests/irl-motion.browser.test.cjs tests/choice-feedback.browser.test.cjs tests/padel-resources.browser.test.cjs tests/sound.browser.test.cjs` —17/17 passed,54.113с,exit0.
- Полный `npm test` —251/251 passed,268.141с,exit0;0 failed/skipped/cancelled, Chromium/WebKit.
- Browser test проверяет начало/середину/конец native animation на320px, полный текст с первого кадра, delay0, длительность в пределах280ms, один принятый double click, точный snapshot Back, rerender, новую попытку после Back, реальный Dream Team→IRL, оба исхода, natural settle и cancel/cleanup.
- В Codex browser отдельно проверен текущий код на320px: обычный выбор01→03B, текст/opacity1 и270px ширина карточки, Back восстанавливает01/ресурсы50, rerender оставляет её на месте. Скрин: корневой `design/irl-motion/implemented.jpg`.
- Независимый review app/index/new test/plan: существенных и второстепенных замечаний нет. `node --check app.js`, `git diff --check`, SHA-256 app cache ref —passed.
- `node scripts/build-offline-deck.cjs` обновил только cache ref app.js в index.html; аудио и offline bundle не изменились.

Evidence: локальный `analysis/2026-10-11-irl-motion/`. Реальные телефоны и субъективная оценка синхронизации звука не проверены. Изменение пока локальное, без commit/push/публикации.

## Подписи исходов матча

Владелец заменил прежние YOU WON/LOST THE MATCH на четыре подписи. Цвет только `YOU WIN!` / `YOU LOSE!` соответствует существующему outcomeTone сделки, а не победе/поражению в матче:

| Матч | Сделка | Подпись | Цвет | Карты |
|---|---|---|---|---|
| Победа | Нет | YOU WIN! The match. Not the deal. | Красный | PADEL_OUTCOME_1 |
| Победа | Да | YOU WIN! The match. And the deal. | Зелёный | PADEL_OUTCOME_2 |
| Поражение | Да | YOU LOSE! The match. Not the deal. | Зелёный | PADEL_OUTCOME_4,5 |
| Поражение | Нет | YOU LOSE! The match. And the deal. | Красный | PADEL_OUTCOME_3,6 |

Цвет использует прежний outcome-ink: failure#922c37, success#12613c. Остальная подпись ink#17212b. Длинный результат может переноситься вместо обрезки. MATCH ABORTED и тексты/эффекты/звуки персонажей сохранены.

Профильный прогон `node --test --test-concurrency=3 tests/personal-chat-runtime.test.cjs tests/source-copy.test.cjs tests/padel-resources.browser.test.cjs tests/irl-motion.browser.test.cjs` —21/21 passed,16.525с,exit0. Canonical test до правки воспроизвёл старую подпись. Все шесть результатов проверены через настоящие выборы на320px; четыре формулировки и цвета отдельно проверены в Codex browser. Скрины вне Git: `design/irl-motion/win-no-deal.jpg`, `lose-with-deal.jpg`. Offline deck и каталог пересобраны; каталог изменений не получил, поскольку score исторически не входит в его visible lines.

Полный `npm test` после новых подписей —251/251 passed,268.864с,exit0,0 failed/skipped/cancelled. `node --check app.js`, синтаксис локального просмотра и `git diff --check` —passed. Свежие логи: `analysis/2026-10-11-irl-motion/{outcome-copy-red.log,outcome-copy-focused.log,outcome-copy-npm-test.log}`.
