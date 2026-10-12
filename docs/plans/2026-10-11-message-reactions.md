# Message reactions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate selected sequential reactions on authored chat messages and eliminate the pop's opacity blink.

**Architecture:** Authored presentation map in app.js, matched to real bubble index and text fragment. Keep waiting rows collapsed during message arrival; reveal1000ms after actual delivery, then expand with shared layout FLIP, grow counts using transform-only native spring. Existing soundEvents snapshot keys deduplicate presentation without playing sound or changing engine state. View transitions, hidden and motion preference changes cancel timers and settle final appearance; retained history remains static.

**Tech Stack:** Existing vanilla JS, CSS, Web Animations, Node test runner, Playwright Chromium/WebKit. Use current dirty release checkout; no commit/push/publish or new checkout.

## Tasks

1. Write browser regressions in tests/message-reactions.browser.test.cjs. Expect authored LIVE_AGENT_01 reaction after its third message delivery; no reaction during typing or the first900ms after delivery; original bubble footprint and200ms arrival; count growth; reaction opacity stays1 throughout each pop; geometry/state/sound unchanged. Cover Back/rerender/restart/hidden/reduced motion/rapid navigation and320/390px. Run and observe missing-feature failure.
2. In app.js add authored presentation map and markup decorator; current nodes get reaction rows, history rows remain final. Connect scheduler to initial delivered nodes, no-pause delivery, deliverNext and reveal-all. Restore uses existing snapshot event keys. Cancel/settle on setView, hidden and reduced-motion changes. No choice delay, effects, sounds or RNG.
3. In style.css add25px outlined pills and 29px row with7px top gap, collapsed until first reaction. Use transform only for pop; reserve count width. Correct prototype reactions.js by removing opacity from first arrival and count-growth animations. Rerun regressions.
4. Rebuild offline deck/cache refs. Run full npm test as required by AGENTS.md; review focused diff against captured pre-stage files. Independent read-only review via requesting-code-review skill. Open actual runtime fixture in Codex, inspect320/390px and motion; preserve former concept and IRL routes.
5. Save QA and updated PROJECT_STATUS.md with fresh evidence and remaining subjective limitations. No publication.

## Authored scope

Sparse team jokes, awkward boasts and concrete agreement, mainly LIVE_AGENT/INFLUENCER, DREAM_TEAM and two AI-related filler replies. Personal LIVE_AGENT_03 pain receives a single 👀, no group count. No reactions on IRL, loss/resource endings, win AI popup or media-only bubbles. Guard each assigned bubble by a literal text fragment; edits that shift messages omit rather than misassign reactions. Complete assignment table is in code and QA.

## Owner timing correction

Owner requested a visible reading pause and restoration of message pop.1000ms after each actual bubble delivery, no early36px reservation, separate transform-only expansion after in-flight arrival settles. Reduced motion keeps the pause; hidden/restored snapshots settle final without replay. Add retained-history visibility checks for hidden/reduced-motion settlement. Current reaction regression suite has10 tests; full npm test and actual fixture verification remain required.

## Owner message entrance clarification

The reported remaining jerk is the appearance of messages themselves. Actual frame comparison shows the existing200ms cubic curve already in the pre-reaction runtime has too abrupt a start. Replace only native game delivery motion with a monotonic325ms critically damped spring and100ms fade-in; keep text scale1 and all chat roots on one shared trajectory. Reaction expansion, Saved, IRL, reduced motion and gameplay deadlines remain unchanged. Four new browser tests fail the old profile and pass the new one; normalize existing trajectory sampling by actual duration. Verify the actual fixture and full gameplay suite before presenting.
