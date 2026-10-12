# Long chat bubbles · QA

2026-10-11. Owner requested meaningful bubble splits while preserving the messages. Current dirty release checkout; no commit/push/publication.

## Visible result

All77 active cards audited; non-IRL text on320/390px had15 bubbles spanning5–8 lines. These now become44 shorter bubbles (29 additional parts), each at most4 text lines in both widths. Existing short messages, media, forwarded content and outcomes are retained. Exact wording, punctuation, emoji, sender and formatting survive. Choices appear after the final part; standard compact reading pauses and325ms coordinated entrance apply. No engine/route/resource/RNG changes or new sound samples.

| Card | Original bubble index | Starts of additional bubbles |
|---|---|---|
| OPEN_01 | 0 | 11,204 / B2BuyerSpyer still |
| OPEN_02a | 0 | We have / I reframed |
| OPEN_02b | 0 | B2BuyerSpyer leads / Clients: |
| INFLUENCER_02 | 1 | You get customers / Usually I take |
| INFLUENCER_02A | 0 | Let's lock / I'll give you / We good? |
| INFLUENCER_04 | 1 | Don't wanna |
| DREAM_TEAM | 1 | Careful though / Let him crush |
| FILL_PAYROLL_1 | 0 | YOUR GUYS / NO REVENUE |
| FILL_COMA_1 | 0 | we post / the internet |
| FILL_DOMAIN_1 | 1 | Someone grabbed / Already on it |
| FILL_DOMAIN_2 | 0 | Those guys / Now these |
| FILL_POLICE_1 | 0 | You're giving / I called |
| FILL_MOM_FLYERS | 1 | I put up / Everyone should |
| FILL_FRIDGE | 0 | I canceled / Fasting extends |
| FILL_FIGHT | 0 | winner takes everything. |

## Implementation

cards.json stores bubbleBreaks by original rendered index and literal start phrases. Runtime splits paragraph DOM ranges and clones sender shells; missing edited phrases leave the original intact. data-message-origin keeps reactions attached to their guarded text. Retained history and media-width capture select the last two original groups, preserving every part and image. Catalog rebuilt without copy changes. Source-audit mechanics excludes the presentation metadata; original source fields and invariant hashes remain verified.

## Evidence

- red.log: old runtime fails the new short-bubble assertions. green-final.log:6/6 pass before extended history coverage. Earlier WebKit timing race was corrected with fixed paused clocks.
- history-red-final.log: previous slice(-2) reproduced missing context (2 versus4 retained nodes) in both engines. Complete source text, retained image and established width are checked after the fix and on rerender.
- focused-final-all.log:42/42 pass,14.454s,exit0 (new6 + delivery + reactions + all source-backed screens/fields). pacing-final.log:2/2 pass,7.050s; context-final.log:14/14 pass,12.869s, including approved Influencer/filler transitions and resource state.
- audit-after.log: no active non-IRL text bubble above4 lines at320 or390px. Real runtime-final.log: Chromium/WebKit320/390 sequential delivery, final choices, team authors, rerender and four screenshots PASS. Actual IAB320 viewed.
- Independent source review found truncated retained groups; corrected shared selection and repeated review returned no remaining actionable findings.
- Final full npm test:277/277 pass,0 failed/skipped/cancelled,374.057s,exit0; npm-test-verified.log. Earlier npm-test-final.log was interrupted after old fixed-count/pacing expectations failed; those expectations now track original message groups and compact reading pauses, with prior assertions preserved.
- Deck before/after differs only by15 bubbleBreaks entries. Syntax and all cache refs verified; app/deck patches saved separately from pre-existing dirty changes.

## Local review

http://127.0.0.1:8803/message-reactions/bubbles.html wraps actual runtime, defaults to INFLUENCER_02A and offers the15 changed cards,320/390 widths, Replay/Back/Rerender and actual choices. The fixture seeds existing cards, never replaces their messages. Four screenshots in root design/message-reactions/bubbles-{320,390}-{chromium,webkit}.png. Existing reaction/IRL/win viewers unchanged. No physical phone or subjective owner approval claimed.

## Chat containment correction, 2026-10-12

Owner's DREAM_TEAM screenshot exposed an overflowing outgoing bubble covering the contact header. Standalone safe scrolling had been restricted to FILL_/INFLUENCER_/LIVE_AGENT_ IDs; DREAM_TEAM fell back to unsafe flex-end and overflow:visible. More authored parts made the mismatch visible.

style.css applies safe flex-end and overflow-y:auto to every non-IRL messenger chat in playing and ended, independent of card ID. Onboarding, Saved and IRL keep their own existing rules. The scope retains ended support: restricting the rule to playing alone regressed Judgment Day's opening image on a short screen, reproduced and corrected after source review. No copy, bubble grouping, entrance/reaction motion, engine, route or state changes.

Owner then rejected the rectangular shelf below the capsule. Playing chats now occupy grid rows1–2 behind the contact, with one transparent scrolling surface. The white rounded contact stays above it at z-index3. Initial top padding reserves contact avatar/padding/margins plus the old message gap; shared CSS variables retain the exact existing default/compact contact geometry. No rectangular contact backing or clip edge beneath its capsule. Ended retains safe scrolling with its separate ending summary; Saved/IRL/onboarding layouts remain separate. app.js focusContinuation subtracts the top padding when fitting media into the readable area beneath the floating contact.

tests/chat-overflow.browser.test.cjs covers Chromium/WebKit320/390: DREAM_TEAM's title hit target remains clear at both scroll positions, all5 parts remain present, delivery follows the last message, the first is reachable at scrollTop0, state/choices/rerender unchanged. Opening text starts below the capsule. After scrolling20px, a hit test immediately below header.bottom reaches the actual message instead of the rectangular shelf; the title still hits the contact. Ended LIVE_AGENT_OUTCOME_2 is also checked at height520: opening image and final text reachable, Start again unchanged. Floating-header focused suite50/50,14.712s,exit0, including delivery/media/splits/reactions. Stable captured pre-change CSS fails4/4 header assertions; playing-only intermediate fails4/4 ended image assertions; old shelf fails4/4 new floating assertions.

Real rAF capture on the DREAM_TEAM viewer keeps the header clear across every sampled delivery/reaction frame in both engines/widths; first/last messages accessible, no page errors, screenshots of both scroll ends. Evidence:analysis/2026-10-12-chat-overflow/runtime-floating.log. Full final suite:289/289 pass,0 failed/skipped/cancelled,233.978s,exit0; npm test -- --test-concurrency=6, npm-test-verified.log. Earlier partial npm-test.log was stopped for the ended scope correction; npm-test-final.log was stopped for the owner's floating-header requirement. npm-test-floating-final.log completed287/289: its two preview assertions still required separate header/chat rectangles. Updated loss-preview checks sample actual contact hit targets, retaining all other viewport/state/lifecycle checks; focused6/6 pass,22.988s,loss-preview-final.log. Source review confirms the P2 fixed and no remaining Important findings, including the semantic header assertion.

Direct review: http://127.0.0.1:8803/message-reactions/bubbles.html?card=DREAM_TEAM. Query card now supports any valid selector option and falls back to INFLUENCER_02A for unknown values.

## Dramatic pauses (2026-10-12)

Owner requested noticeable stops between successive bubbles. Default reading beats now1100/1500/1900ms by previous text length (media1900), with400ms for a new original message,300ms on team speaker change and200ms before outgoing text. Fragments sharing messageOrigin omit the new-message beat. Explicit authored pauses remain authoritative. DREAM_TEAM's650ms opening is followed by2200/1100/1100/1800ms.

Reactions still wait1000ms from their own delivered bubble, not from the next delivery. Rerender preserves the current deadline; tapping/keyboard reveal and Back do not replay pauses. Message spring remains325ms, with separate reaction expansion. Gameplay and original copy/deck are unchanged.

New dramatic-pacing tests verify exact boundaries, reactions during a reading beat, rerender deadline preservation, choice availability and unchanged state in both engines. Existing coordinated-arrival/message-arrival tests retain trajectory assertions and explicitly settle prior reaction layout before sampling native message entrance; actual reaction-layout rAF tests verify their combined real-time continuity. Controlled-clock gameplay tests now allow the longer presentation instead of attempting disabled replies at old deadlines.

Final verification: npm test -- --test-concurrency=6 passed **293/293**,0 failed/skipped/cancelled,273.626s,exit0, Chromium+WebKit. Final log:analysis/2026-10-12-dramatic-pacing/npm-test-final.log. Focused transitions26/26, native arrival+reactions14/14, reaction-layout6/6 including real rAF all passed. Source review found no Critical/Important issues. Syntax/cache rebuild/diff checks passed. Intermediate full logs are historical timing expectation failures, not the verified final run. IAB confirmed app.js?v=1d709094d57d; local viewer pauses-v4. This evidence records the locally validated pauses-v4; Git delivery status is recorded in PROJECT_STATUS.md.
