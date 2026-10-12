# IRL «Удар и посадка» Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Внедрить выбранный владельцем вариант1: короткий импульс новой обычной IRL-карточки одновременно с текущим P1.

**Architecture:** Использовать существующий fresh padel event в stageCardMessages и его snapshot/dedup в soundEvents. Физическую траекторию утверждённой пружины650/42/1 семплировать в native Web Animations; длительность получается из порога остановки. Общая arrivalAnimations отменяет движение при переходе/Back/rerender/вводе/resize/reduced motion; hidden также отменяет новую IRL-анимацию. Исходы полностью пропускают обычный эффект.

**Tech Stack:** Vanilla JS, Web Animations API, node:test + Playwright Chromium/WebKit. Новых зависимостей нет.

**Status:** Все три задачи завершены. TDD red воспроизведён, новый browser test8/8, focused17/17, полный npm test251/251. Независимый review без замечаний; текущий код проверен в локальном браузере на320px. Commit/push/публикация не выполнялись. Подробности: `docs/qa/irl-motion.md`.

---

### Task 1: Проверка ожидаемого поведения до внедрения

- Create: tests/irl-motion.browser.test.cjs.
- Реальный выбор IRL01→03B на320px: текст целиком/opacity1 в click turn, начальный scale.985/y3, завершение в пределах280ms существующего lock, один accepted choice при double click.
- Dream Team→IRL: обычный импульс карточки + короткий scene opacity entrance; оба начинаются без resourceAttention delay.
- Back/rerender/reduced motion: без повторов; исходы только с существующей outcome анимацией; cancel/cleanup при navigation/resize/reduced motion/hidden.
- Run: node --test --test-concurrency=1 tests/irl-motion.browser.test.cjs. Сначала ожидается failure из-за отсутствующей анимации.

### Task 2: Минимальный runtime

- Modify: app.js. Добавить семплирование пружины и animateIrlArrival; вызывать только по fresh padel event и без outcomeTone. Держать всю строку/карточку вместе, opacity1 на обычном ходе, без движения портрета/фона/кнопок.
- Entry opacity180ms linear только при предыдущем non-IRL card; старая сцена заменяется сразу. Удалить неработающий is-pop/animationDelay для IRL.
- Не менять resolver, игровой lock, state/RNG, copy и звук. Учитывать Back soundEvents snapshot и fresh accepted transition после Back.
- Run focused browser test; минимальные исправления по фактическим failures.

### Task 3: Проверка и передача

- Regenerate: node scripts/build-offline-deck.cjs (обновит cache ref app.js в index.html; PCM остаётся прежним).
- Run focused choice/padel/sound tests и npm test; git diff --check.
- Inspect actual current code in local browser; сохранить отдельный screenshot и запись проверок в docs/qa/irl-motion.md.
- Провести независимое code review, устранить существенные замечания. Обновить корневой PROJECT_STATUS.md.
- Commit/push/publish/merge не входят в разрешённый этап. Оставить локальные проверенные изменения для владельца.
