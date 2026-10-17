# Chat typing implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver whole chat bubbles with fast typing pauses and allow tapping the chat to reveal the rest without choosing an answer.

**Architecture:** Extend the existing card delivery queue to personal and team containers. Infer ordinary pauses from rendered bubble boundaries and authors; keep authored dramatic pauses in cards.json. Delivery remains presentation state: no resource, choice, random outcome or history effects until an actual answer.

**Tech Stack:** Plain JavaScript/CSS, canonical JSON deck, Node test runner and Playwright Chromium/WebKit.

## Agreed design

### Review revision, 2026-09-28

Owner reported detached typing nicknames, silent appearances, missing dots after ASAP and overly rapid/jerky motion. Group nickname/role and dots now share one white bubble. Every pending incoming bubble, including media/forward/outcome, has dots; single incoming text cards start with a 500 ms pause. Ordinary gaps are 500 ms, group author changes 600 ms. Authored pauses remain at their boundaries, with ordinary pauses filling previously batched boundaries: LIVE_AGENT_03 completes in 3.5 s, LIVE_AGENT_05 in 3 s, LIVE_AGENT_07 in 2.5 s. Other active cards still complete within 2 s. Same-author dots retain their animation instance across delivery; typing has no entrance bounce and arriving text uses a short ease-out fade/4px slide. Rerendered delivered bubbles do not replay entrance animation.

The original draft below records the first implementation; the revision above supersedes its short-gap, media-indicator and batched timing decisions.

Existing bubbles now ease into their new positions after delivery instead of jumping upward by about 55px. Movement uses the stage's local vertical axis, is skipped while the reader explores history, and honors reduced motion.

- Whole bubbles after animated dots; ordinary cards generally wait 1–2 seconds in total. First bubble is immediate; later same-author bubbles wait 300–500 ms, a new group author waits 600 ms. Short reactions, photos, forwards and outcome reactions use brief gaps without typing dots.
- Existing LIVE_AGENT_03 greeting stays 1 s + 2 s. LIVE_AGENT_05/06/07 keep their existing authored pauses. LIVE_AGENT_07B becomes 500 ms then 1250 ms before the ultimatum; INFLUENCER_05 gets 600 ms then 1100 ms before its demand.
- Team typing shows the next author's avatar and name. Outgoing text, IRL, saved notes, already delivered Back views and revisited cards reveal immediately.
- Tap/click anywhere in chat reveals pending bubbles, cancels its timer and enables replies. The typing indicator is also keyboard operable. Pointer movement/scrolling must not skip; delivery must not steal scroll from a reader exploring history. The reply hint briefly explains the gesture.
- Preserve all copy, game effects, image decoding and the four existing history transitions. Restart creates a fresh delivery; rerender preserves its deadline and progress. No merge without owner acceptance.
- Isolated checkout .typing-preview, branch chat-typing, starts at character-avatars b6b11b6. PR compares against character-avatars until PR #2 is accepted, then retarget main.

## Task 1: Delivery and reveal regression tests

Create tests/chat-delivery.browser.test.cjs. Test outgoing first bubble, source changes in group typing, exact automatic delivery, reveal without game-state effects or later duplication, keyboard reveal, pending rerender, Back/restart, Influencer repeat, image/caption and drag/scroll. Use both browser engines, fake time for deadlines and mobile viewports.

Run `node --test tests/chat-delivery.browser.test.cjs` and verify missing behavior fails before runtime edits. Baseline `npm test` is already running in the isolated checkout.

## Task 2: Runtime and authored pacing

Modify app.js stageCardMessages to select team/personal hosts, infer default pauses and identify next author. Reuse deadline/pauseIndex delivery state, add stale-callback checks and a reveal closure cleared on setView. Guard choices while pending. Add pointer gesture tracking; restore normal reply hint on completion. Preserve reader scroll through rerender/resize and delivery. Modify style.css only for the clickable dots, team indicator and scrolling supported messenger modes. Modify cards.json timing only for the two authored sequences above; regenerate offline bundle and runtime hashes with `node scripts/build-offline-deck.cjs`.

Run new regressions; investigate actual failures before adjusting runtime. Existing tests that intentionally assume immediate delivery must wait for completed delivery or explicitly reveal it; exact pause tests must match the revised authored timing.

## Task 3: Verification and review delivery

Run `npm test`, `git diff --check`, compare game.js and narrative/resource data to the base. Review desktop/mobile normal play and tap/scroll in a browser. Inspect diff for cancellation, state restoration, repeated taps and photo fit. Commit/push only this feature branch; create a draft dependent PR, attach it to the chat and verify Pages/CI. Update the parent PROJECT_STATUS.md with fresh evidence and review next steps.
