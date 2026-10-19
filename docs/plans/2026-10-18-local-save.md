# Local Save Implementation Plan

> Implement with the executing-plans workflow; user approved local autosave on 2026-10-18. Continue the current release checkout. No commit, push or publication requested in this stage.

**Goal:** Return to the same attempt after reload, with explicit Continue/View result and New run.

**Architecture:** One versioned JSON checkpoint in localStorage contains the complete route state and presentation phase. Restore never resolves a choice or starts a run. QA modes do not access the player slot. Existing route rules and CEO classifier remain unchanged.

**Tech Stack:** Browser JavaScript, localStorage, Node test runner, Playwright Chromium/WebKit.

1. Add failing tests in `tests/save.test.cjs` for JSON roundtrip, signed ledger/RNG, invalid and incompatible records, storage failures, stale writes, and QA isolation. Run `node --test tests/save.test.cjs`; implement `assets/save.js`; rerun.
2. Add failing browser tests in `tests/save.browser.test.cjs` using an HTTP origin and sound off before load. Cover first entry, immediate reload after accepted choice, Continue without reset, Quit/Cancel, replacement confirmation, finished state and reward phases, corrupt/blocked storage, QA isolation. Use existing route witnesses rather than a full gameplay suite.
3. Integrate checkpoints and presentation restore in `app.js`. Adapt title/confirmation and save status, including accessible controls. Add a small `assets/save.css`, load both in `index.html`. Preserve preview/test isolation and guard obsolete callbacks.
4. Update affected exit/title tests and their shared helper for Continue/New run; update README and current STATE_BIBLE navigation rules. Add save unit test to `package.json`, regenerate bundle/cache versions with `node scripts/build-offline-deck.cjs`.
5. Run unit tests and targeted save/navigation browser tests with sound disabled, syntax and diff checks. Do not run the full gameplay browser suite (existing user constraint). Inspect title on mobile/desktop. Review final diff and update root PROJECT_STATUS.md with evidence and remaining real itch/Safari checks.

Acceptance: state and RNG exactly preserved; no duplicate resource costs or wins; invitation/revealed reward/loss finale resume correctly; New run replaces the slot with a new seed; invalid/failed storage never claims success or breaks play. No cloud or collection of rewards across attempts.
