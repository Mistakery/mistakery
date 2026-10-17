# Resource feedback implementation plan

**Goal:** Make reply consequences readable inside the existing light-blue messenger, without changing gameplay, story copy or replay behavior.

**Architecture:** Retain the four HUD nodes across renders. Use the last resolved history entry's rawBefore/rawAfter for signed deltas and resourcesBefore/resourcesAfter for bar motion. Scope transient effects to the rendered state and cancel them on navigation. Fold a short attention window into the first existing message pause; do not add it to every pause. Reduced motion gets static signed feedback; terminal endings remain immediate.

**Tech stack:** Existing plain JavaScript/CSS, node:test and Playwright Chromium/WebKit.

The design and implementation were authorized in the preceding chat. Continue in the existing dirty worktree, with no commits, new checkout, PR or extra agents.

1. Save before screenshots of seeded opening/refusal at 320×650, 390×844 and desktop in both browsers. Verify HTTP bytes and preserve pre-edit source hashes.
2. Add browser regression tests for real raw deltas, bounded bar motion, warning edges, no-op resources, repeated clicks, message attention and cancellation. Run them against the previous implementation to demonstrate failures.
3. Update `app.js` and `style.css`: persistent HUD; readable same-palette labels, fill, signed feedback; near-edge warnings including high Team/Founder. Report outside-scale balance without clipping the change. Preserve hover preview without revealing random outcomes.
4. Coordinate feedback with existing send/delivery lifecycle. Reuse initial typing time; hold immediate new text briefly when needed. Navigation cancels effects and releases only its own lock. Judgment Day renders immediately. Reduced motion has no resource motion or added wait.
5. Run focused lifecycle tests, then `npm test`. Capture matching after screenshots, inspect actual pixels, check layout/media/controls and served file parity. Do not weaken existing assertions.
6. Regenerate cache asset versions with the existing build script, prove deck/route/engine unchanged, save evidence, and replace the root `PROJECT_STATUS.md` with a verified current handoff.

## Implemented choices

- Keep existing icons, font family, messenger shell, media and outcome colors. Bars are 6px; labels 9–9.5px; glyphs 12–13px. Reuse the header's existing spacing so the ordinary chat and choice rectangles remain unchanged.
- Signed deltas remain visible for 1.8 seconds; changes below two points use quieter type. The bar moves for 420ms between HUD values, while the number reports the full raw accounting change. Outside 0–100, an additional 12px line states the actual balance.
- LOW at ≤15 and HIGH at ≥85 indicate the selected fatal boundaries. Only Team/Founder have a high warning. Sign and warning color have separate meanings; no universal green gain or red loss.
- Give text 200ms for a small change or 420ms for a substantial change. Existing opening waits absorb this window. Keep existing first photos immediate, with their reading pauses intact; preserve subsequent authored waits. IRL uses its existing entrance delay. Reduced motion adds no wait or bar motion; terminal endings render immediately.
- One per-render feedback scope owns its timer and animations. Navigation cancels it. Message-pause plans survive rerender/Back alongside the existing delivery snapshot. The game state and RNG are resolved exactly once by the unchanged route.
- The former assertion that same-thread text always arrives instantly is superseded by the approved attention window. Its replacement asserts exact 200/420ms boundaries, preserves immediate photos, verifies unchanged subsequent reading pauses, and checks that waiting never resolves another choice. No tests were removed or skipped.

Evidence is in root `analysis/2026-10-03-resource-feedback/`, including frozen source/before captures, matching after captures, browser traces, logs and file hashes. The final verification report records the completed full suite.
