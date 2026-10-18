# Retire unused deck cards — Implementation Plan

**Goal:** Remove only cards unreachable from the current production game.
**Architecture:** Keep the current release as the baseline. Preserve every active record exactly; prove exclusion using UI entry points and the route graph, and retain a mechanical inverse patch so the original source-audit hash stays authoritative.
**Tech Stack:** JSON, CommonJS, Node test runner, Playwright Chromium/WebKit.

1. Read current status/instructions and inspect route, engine, UI, catalog generator and source invariants. Branch from current release (explicit task requirement overrides old-main starting guidance).
2. Capture immutable baseline hashes and retired mechanical records in `docs/qa/deck-cleanup/baseline.json`. Add `tests/deck-cleanup.test.cjs`; run before deletion and confirm it detects the obsolete production records.
3. Remove the 23 isolated legacy records and their scheduler references from `cards.json`; remove obsolete fallback translations from `scripts/build-card-catalog.cjs`. Keep active card records, translations, Saved, founder reward and runtime byte-identical.
4. Preserve the original source mechanics hash by reconstructing only the explicitly retired records/scheduler in `tests/source-copy.test.cjs`. Add graph/reference checks and replay real resource-valid witnesses for every retained card.
5. Run `node scripts/build-offline-deck.cjs` and `node scripts/build-card-catalog.cjs`. Run focused source/route/founder/cleanup tests, then `npm test`, inspect affected browser paths and generated artifacts. Do not weaken invariants.
6. Write `docs/qa/deck-cleanup.md` with exact IDs, rationale and counts. Update root `PROJECT_STATUS.md` from fresh Git/test evidence. After verification, fast-forward the existing release branch and update its draft PR #5, following the repository revision workflow. Do not merge main before owner acceptance.
