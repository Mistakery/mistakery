# Owner presentation changes — 2026-10-05

Historical first pass: the owner subsequently clarified typing dots and meter-only feedback. See typing-correction.md for final behavior; sideways send and whole-resource halo described below were removed.

## Scope and decisions

Existing dirty checkout, detached e8c2a27abddca37291879bec0a06454833550e96. No engine/route/loss asset changes in this stage; previous changes retained. No commits, dependencies, agents or publication.

- Relaunch keeps the existing fresh-attempt path through both Saved screens
- Intro uses sources['@b2buddy'], existing image and AI Agent role; text and 620ms delivery remain
- Dream Team: 8 members · 3 online; loss departures derive their initial number from that same source metadata, yielding 8 → 3 after the five authored departures. Protected loss fixture/copy unchanged
- Fresh outgoing arrival starts 18px to the right with the existing coordinated vertical displacement and 200ms easing. Retained replies only move during continuation, without another fade. Authored outgoing bubbles animate once; restored delivery does not replay
- Saved first bubble has no entrance animation. The separately delivered second bubble animates at the existing 1000ms deadline; deadline crossed during rerender is consumed exactly once. Small screens clip/scroll notes inside the chat and follow delivery, leaving the contact visible
- Resource label/fill/tint follow raw ledger sign: down #c23848, up #178454, including Founder. A 720ms halo accompanies the existing fill/glyph feedback; the existing 1800ms feedback window and 200/420ms attention timing remain. Reduced motion retains static colors. No numeric HUD deltas

## Checks

Regression assertions first demonstrated missing sender/member count, Saved entrance lifecycle, directional send and resource colors. A screenshot exposed existing Saved header overlap at 320px; a failing Chromium/WebKit test preceded the scoped scroll fix.

Focused passes: contact/source unit 10/10; resource/founder 22/22; final owner/Saved 14/14; source-copy invariants 2/2. Final npm test: 201/201, zero failed/skipped/cancelled, 233.606 seconds, exit 0. Evidence: root analysis/2026-10-05-send-feedback/npm-test-final.log.

Existing suites retain exact delivery boundaries, fees/settlement/RNG, Back/restart cancellation, reduced motion, all four Founder100 bubbles, modal loss restart and desktop/mobile/rotated geometry. New tests cover computed sign colors, zero untouched resources, fractional reply fee, Founder both directions, static reduced feedback, no feedback replay, authored outgoing and overdue Saved rerenders, and 320px Saved scrolling.

HTTP bytes match app.js, style.css, deck bundle and index. Screenshots: Chromium/WebKit at 320×650, 390×844, 1280×900. Actual screenshots inspected for Saved/resources; original 320px overlap corrected and recaptured. Demonstration shows second Saved, founder send, mixed Cash down/Founder up, and Cash up/Founder down.

Evidence outside checkout: root analysis/2026-10-05-send-feedback/. Contains pre-edit app/style/deck, capture script, screenshots, demo.webm/demo.gif and full test log. No physical handset test or human visual acceptance claimed.
