# Message reactions · QA

Current local selected growing variant, 2026-10-12. Scope: app.js, style.css, cache refs in index.html, browser regressions and local review fixture; deck/engine/route/resources/sounds unchanged by this correction. Previous dirty win/IRL/bubble changes preserved. No commit, push or publication.

## Visible behavior

Small outlined white pills with emoji and count appear1000ms after actual message delivery, independently of message entrance. Second emoji joins220ms later. Count grows from1 to its authored final340ms after arrival; count1 does not perform a redundant update. Personal conversations show a single emoji with no group count. No taps or added sounds. A native650/42/1 spring changes translateY(3px→0) and scale(.96→1), never opacity. The original prototype restarted opacity at.35 on counter growth; this was the blink, now removed in prototype and runtime.

Owner rejected the empty reserve on2026-10-12. Waiting rows now use display:none, so messages arrive at their ordinary text height. After1000ms, the row occupies its final36px and an independent325ms576/48/1 spring unfolds the background and adjusts neighboring messages/avatars. Native translate composes with the original message transform/opacity without cancelling/restarting its animation. A temporary surface scales only the background, never copy. Full emoji/count widths are retained while later pills are hidden; second-pill/count growth changes no layout. Follow uses the logical bottom of direct chat children, excluding transient transform overflow; scroll anchoring is disabled. Resources/RNG/history/turn and choice timing remain unchanged.

## Message entrance correction

Owner clarified that the remaining jerk concerns the messages themselves. Frame comparison reproduced the abrupt200ms cubic-bezier(.2,0,0,1) entrance in both the pre-reaction baseline and integration: about half of its travel in the first40ms. Gameplay delivery now uses a sampled critically damped576/48/1 spring over325ms, about25% travel at40ms, monotonic arrival with no overshoot or text scale. Opacity settles by100ms. All moving chat roots share the same displacement and timeline; delivery/typing/choice deadlines remain unchanged. An independent reaction expansion now composes through translate; Saved, IRL and reduced motion paths keep previous message motion. Initial connected incoming bubbles can still use the existing small4px CSS entrance (220ms).

The new message-arrival browser regression covers Chromium/WebKit at320/390px: gradual acceleration, monotonic position, bounded per-frame movement, shared timing, stable gaps, unit text scale and unchanged state/deadlines. The previous200ms profile failed all four tests; the spring passes. Existing coordinated-arrival tests now sample normalized progress across actual duration rather than stopping at200ms.

## Authoring

| Card | Original bubble index, zero based | Meaning | Reactions |
|---|---|---|---|
| LIVE_AGENT_01 |2 /3 | Sales ex joke / AI bravado | 😂3,👀2 /🚀2 |
| LIVE_AGENT_02 |1 /2 | Performance callout / MIC DROP | 😬2 /👏2,🔥1 |
| LIVE_AGENT_03 |2 | AI admits pain | 💀, no count |
| LIVE_AGENT_08 |2 | Developer's awkward admission | 💔2 |
| INFLUENCER_01 |1 /2 | Skepticism /20% spending limit | 🤨2 /🤝2 |
| INFLUENCER_05 |2 |60% revshare and cofounder demand | 😳, no count |
| INFLUENCER_07 |2 | More views from screw-ups | 😂2 |
| INFLUENCER_08 |1 /2 | Server overload / manual searches | 😬2 /🤯2 |
| DREAM_TEAM |0 /2 | Founder's prospect / clout boast | 🎉2 /😂2 |
| FILL_AI_DEV |1 | Fire me then | 🫠2 |
| FILL_PAYROLL_2 |0 | No overtime | 🫡2 |

Guard by original bubble index (data-message-origin after authored splitting) plus literal text fragment, normalized for typography's nonbreaking spaces. Copy changes that invalidate a guard omit that reaction. No reactions on IRL, media-only bubbles, story/resource endings or win AI popups. 🔥 on a boast is a teammate's enthusiasm, not a victory/resource signal. No random decorations or new entities.

## Lifecycle

Presentation keys use the existing soundEvents WeakMap and test snapshot serialization, with no sound kind. Mark at scheduling, so mid-pop rerender/Back restores final state and cannot replay. Retained history renders final. Fresh attempts may show their own new reactions. Hidden delivery shows final without late replay. Fresh reduced-motion delivery retains the same1000ms reading pause and omits transforms. View replacement, hidden and motion preference changes clear timers, cancel animations, remove pending attributes and clean will-change. Connected waiting rows settle immediately to final height and follow the latest logical content when follow is enabled. Cleanup removes temporary surfaces and layout animations. Reaction scopes remain separate from delivery animations.

## Historical evidence, before2026-10-12 correction

- Original red.log reproduced missing Sales reaction. delay-red.log now reproduces too-early visible reactions and reduced-motion skipping the reading pause.
- arrival-diagnostic.log compares pre-reaction app.before.js with integration: reserved rows changed bubble80→116px and arrival87→123px. Removing that reservation restores the original size and travel; arrival-diagnostic-after.log verifies80px and87px again. Remaining1px rounding/scroll difference on the last arrival is immaterial; duration and easing unchanged.
- delay-focused-final.log:10/10 passed Chromium/WebKit;320/390, all11 authored cards, copy guard, retained history, static rerender/Back, mid-growth restoration, no opacity keyframes and sampled opacity1, unchanged initial bubble footprint/200ms arrival, no visible reaction900ms after delivery, stable chat scroll/height during count growth, unchanged state and sound cue count, reduced motion, simulated hidden, navigation/restart and personal no-count.
- Independent read-only review: outgoing DREAM_TEAM guard coverage P2 found and corrected; source confirmation returned no remaining actionable findings. Follow-up review found a P2 in hidden/reduced-motion settlement of collapsed rows; settle-red.log reproduced clipped newest content in both engines, shared expansion/follow fixed it, and repeat source review has no remaining findings.
- Native WA has a real timeline independent of Playwright mock clock. Geometry test finishes only parent delivery animations before comparing reaction-only layout; pop opacity is sampled across actual animation keyframes. Hidden test overrides document.hidden and dispatches visibilitychange; physical app suspension is not simulated.
- Previous reaction-stage full npm test (before the message entrance correction):267/267 passed,0 failed/skipped/cancelled,374.323s,exit0. Log:npm-test-delay-final.log. The earlier265/265 result is historical. Actual fixture real-time delay1001–1003ms in Chromium/WebKit320/390; final counts, choices visibility and no page errors PASS (runtime-delay.log, verify-game.cjs). Four screenshots regenerated;320px WebKit visually inspected. No physical phone or subjective owner motion approval claimed.

## Earlier message entrance verification

- message-motion-red.log:4/4 fail against abrupt baseline; message-motion-green.log:4/4 pass,2.027s,exit0.
- message-motion-focused.log:26/26 pass,94.395s,exit0, combining new message entrances with reaction and coordinated-arrival coverage.
- message-frames-after.log and message-frames-{baseline,current}.json: actual requestAnimationFrame capture of real replay before/after; geometry remains the same, movement is slower and smooth.
- runtime-message-motion.log: actual fixture Chromium/WebKit320/390, real reaction delay1000–1030ms, final counts, choices and no page errors PASS; four screenshots regenerated. Actual IAB replay inspected.
- Independent source review: no actionable findings. The small initial connected CSS entrance noted above is unchanged.
- Full npm test:271/271 passed,0 failed/skipped/cancelled,374.162s,exit0; message-motion-full-host.log. The sandbox launch failure in message-motion-full.log is environmental and is not a passing result. Syntax, fresh cache refs and git diff --check PASS; app157248a21f0a, stylee50528bb7004. All non-app cache hashes match the before-message-motion snapshot.

## Local review

Current review: http://127.0.0.1:8803/message-reactions/bubbles.html?card=DREAM_TEAM&review=20261012-compact-v3. Selector also offers INFLUENCER_08 and all15 split-message cards. Local server sends no-store; iframe version also changed.

http://127.0.0.1:8803/message-reactions/game.html wraps the real current runtime without replacing its messages. Replay uses existing story restart, Back uses actual snapshot button, choices play the real route. Width320/390, no new runtime scene switches. Original concept comparison and IRL/win routes preserved. Four game-320/390-Chromium/WebKit screenshots live in root design/message-reactions/ outside checkout.

## Historical interference correction verification, before owner rejected the reserve

- tests/reaction-layout.browser.test.cjs pauses INFLUENCER_08 native entrance at100ms and advances reaction timers: unchanged bubbles/text/avatar geometry, scroll, opacity, animation object/currentTime, gameplay state and choice availability. Chromium/WebKit320/390: captured baseline fails4/4; correction passes4/4.
- Focused message/reaction/coordinated/bubble suite36/36 passed94.493s, exit0, before the added vocabulary≥10 assertion. Current authored vocabulary has15 distinct meaningful emoji. Final full-suite result is recorded in PROJECT_STATUS.md.
- Real requestAnimationFrame capture of local INFLUENCER_08 in both engines/widths: reactions arrive approximately1000ms later, preserving height, avatar alignment, scroll and the ongoing message entrance timeline. Normal native translation can continue while the pill appears; no extra layout motion is introduced. Four screenshots, no page errors. Evidence:analysis/2026-10-12-reaction-motion/live-frames.log.
- Independent source review found no Critical/Important issues. Physical phone and owner subjective motion approval are not claimed.
- Final full npm test:281/281,0 failed/skipped/cancelled,372.809s,exit0. Current log:analysis/2026-10-12-reaction-motion/npm-test.log. Build, node --check app.js, cache refs and git diff --check PASS:appa8276abc7ada/style64d826994fa6, deck90b876b50989 unchanged.

## Compact expansion verification,2026-10-12

- Captured reserve baseline fails4/4 compact-footprint assertions. Independent paused native entrance at100ms survives reveal unchanged; the initial expansion frame preserves text/avatar positions and opacity. Background grows monotonically through scale samples, while layout uses a separate translate property.
- First real rAF attempt revealed32–36px jumps from scroll anchoring and transient transform overflow in scrollHeight. Final logical-bottom follow and overflow-anchor:none remove them. New real-time regression tests retain the requirement; no return to reservation or cancelArrivalMotion.
- Focused final30/30 pass,12.088s,exit0: reaction/delivery lifecycle, splits/context, floating contact/ended scroll and real-time frame continuity.
- Real DREAM_TEAM/INFLUENCER_08 × Chromium/WebKit ×320/390:8/8 pass, compact waiting rows on every frame, unit text scale, header always accessible, latest visible, all surfaces released and no page errors. Frame samples/logs/screenshots:analysis/2026-10-12-reaction-expansion/runtime-final.log.
- Independent source review found no Critical/Important findings after logical-scroll correction. Final full npm test -- --test-concurrency=6:291/291 pass,0 failed/skipped/cancelled,233.227s,exit0; npm-test-verified.log. The earlier289/289 run did not include the final scroll correction or the two new real-time cases. Build/cache refs, syntax and git diff --check PASS; appb8af3a187373/styleb02eca32e3f9, deck90b876b50989 unchanged. Final waiting screenshot captured after the native entrance finishes; screenshot-verified.log passes both reported cards on WebKit390. The first screenshot-only attempt timed out on a retained finished CSS animation; the check now distinguishes finished from active animations.
