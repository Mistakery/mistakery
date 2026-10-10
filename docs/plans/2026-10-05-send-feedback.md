# Send and resource feedback Implementation Plan

Owner correction after initial delivery: outgoing means Founder100-style typing dots; red/green feedback only inside the meter. This supersedes sideways outgoing motion and whole-resource halo below. Final behavior/checks: docs/qa/typing-correction.md.

> Execute with superpowers:executing-plans, in the existing dirty checkout; owner authorization overrides new worktree, approval and commit defaults

**Goal:** Deliver the five owner-requested presentation changes without changing mechanics or copy

**Architecture:** Reuse delivery snapshots/deadlines and the shared WAAPI arrival lifecycle. Outgoing motion is a fresh-delivery decoration, never a render side effect. Resource direction comes from raw ledger differences; static sign color remains under reduced motion

**Tech Stack:** Vanilla JS/CSS, node:test, Playwright Chromium/WebKit

1. Baseline: preserve app/style/deck in root analysis/2026-10-05-send-feedback, verify HEAD/status and source-copy tests. Existing 200ms retained sends, 1000ms Saved deadline, 1800ms resource feedback and 200/420ms attention windows remain
2. Contacts: regression assertions for intro @b2buddy/avatar/AI Agent, Relaunch, 8 members and departure count; update app.js, index.html, cards.json. Derive departure count from live thread metadata without editing protected loss data. Rebuild bundle/catalog and run contact/source checks
3. Outgoing: first Saved has no entrance; second Saved uses fresh-delivery motion (including deadline crossed on rerender), never replayed after delivery. Add directional entrance to shared outgoing arrivals while preserving vertical coordination, 200ms sends, preview Founder100 timing and immediate separate-card transitions. Extend Saved/founder tests for no replay, motion preference and geometry
4. Resources: regression assertions for computed red/green, including fractional Cash, Founder both directions, mixed/zero, clipped ledger and rapid consecutive actions. Use sign-colored label/bar with a visible halo pulse in the existing feedback scope; preserve 1800ms lifetime and no numeric HUD
5. Run focused tests after each stage, complete npm test, diff check and unchanged mechanical/source invariants. Capture visual HTTP evidence at mobile widths and desktop in Chromium/WebKit, demo Saved and resource motion. Rebuild cache assets and update root PROJECT_STATUS.md with current evidence

Risks: renderSaved currently adds is-pop to every bubble, repeated renders can restart CSS animation; sign attributes currently have no visual CSS; loss departure count uses a historical 7-member fixture. Avoid new timers for effects settlement and don't alter route/engine/loss data
