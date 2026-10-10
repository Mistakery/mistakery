# Resource endings without Last Chance — Implementation Plan

**Goal:** Make six approved resource defeats playable and unmistakable; prove their reachability using actual route decisions and show how resources changed.

**Architecture:** Keep the existing story/filler route and messenger renderer. Settle resources after an outcome acknowledgement or completed filler unit, before drawing the next episode. Preserve all signed episode changes while displaying bounded 0–100 bars. A terminal state renders one character reaction with Game over, its ending title/cause and Restart. No crisis choice, rescue roll, success-reaction screen or variants 7–9.

**Tech stack:** Vanilla JavaScript, canonical JSON/offline bundle, Node test runner, Playwright.

**Scope and assumptions:** This continues the existing story-filler-route version at e8c2a27 in an isolated local worktree. No commit/push/publication. The owner confirmed boundary timing: after the plot outcome, and after a single card or complete linked unit between plots. Preserve all authored decision costs, refusal penalties, starting resources and -0.5 cash per gameplay answer. Cash/Customers high endings are unselected and do not fire in this trial. Judgment Day is a terminal world event, not a simulation. Ending display and restart are navigation, not gameplay answers.

## 1. Runtime behavior, test first

- Create `tests/resource-endings.test.cjs` covering all six edges, two excluded high edges, complete plot and linked-filler boundaries, signed negative/overflow accounting, recovery before settlement, simultaneous-edge priority, no RNG draw/extra burn after death, deterministic Back snapshots, and immediate Judgment Day.
- Run `node --test tests/resource-endings.test.cjs` and confirm missing behavior failures.
- Modify `assets/route.js` to settle an episode exactly once and retain a terminal explanation. Use deterministic Cash → Team → Customers → Founder precedence when multiple selected edges fail; record every failed edge for inspection.
- Keep `game.js` and its archived Last Chance engine unchanged. Make old graph-coverage tests explicitly use a nonterminal fixture rather than weakening production ending tests.

## 2. Used ending content

- Reuse six `endings` definitions in `cards.json`, add only the metadata/reaction copy needed by the route. Reuse known characters, use customer wording valid both before and after a sale, and avoid resurrecting an unavailable assistant.
- Read the relevant character rules and current sender cards before editing copy. Remove simulation wording from the existing Judgment Day outcome and update its translation.
- Do not add unselected ending variants or rescue cards. Regenerate `cards.bundle.js` and `MISTAKERY_CARDS_EN_RU.md` using the existing scripts; update catalog explanatory text for this mode.

## 3. Terminal messenger UI

- Add a small scoped ending style under `assets/`; update `index.html` and `app.js`.
- Reuse character avatars/message rendering. Show persistent `GAME OVER · YOU LOST`, ending name and the triggering resource/value on the same scene; provide one `Start a new run` button.
- Disable ordinary choices and hover previews, retain test Back/Restart and ending inspection. Resource changes are applied before rendering, once. Show multiple simultaneous causes accurately.
- Cover mobile/desktop layout, restart, Back, repeated rendering and no duplicate accounting with browser tests.

## 4. Reachability and understandable accounting

- Add a seeded analysis runner using the real route, not a replacement resource model. Find replayable witnesses from normal starting resources for all six endings; save seed, decisions, visible/raw changes and final causes.
- Run a clearly labeled random-policy sample across six initial orders. Report unresolved/unreached cases honestly; do not silently tune the deck to make a report pass.
- Replay witnesses in tests and at least one ordinary browser flow. Add an editor-facing Russian report with readable resource paths; keep numeric deltas out of ordinary hover UI per existing guidance.

## 5. Verification and handoff

- Run targeted tests, then required `npm test` with installed Playwright browsers. Check the actual new UI in the browser and save desktop/mobile evidence.
- Update README and State Bible's current-route section, without changing unrelated world canon. Update root `PROJECT_STATUS.md` with the worktree path, author constraints, actual test results and reachability limits.
- Show the local playable result. Do not merge, commit, push or publish.
