# Full-screen loss feedback in the six-card visual preview

Owner request: each of the six visual-test cards should feel like defeat, with a red animation across the whole screen.

- Trigger when the last authored message is delivered, including tap-to-reveal. Preserve the founder typing pauses.
- Append an aria-hidden, fixed viewport overlay to the body so the red pulse also covers the area outside the phone. It passes pointer input through.
- Use the existing failure palette and short chat jolt. Add a single 1.3-second red pulse, fading back to a subtle red edge tint and failure-colored phone.
- Replay and card navigation clear the feedback before the new delivery. Each completed card triggers it again.
- Reduced motion retains the static red tint without the pulse, jolt or local outcome animation.
- Preview-only visual state: no new route, game-over screen, resource settlement, reply destination or source-document changes.

Acceptance: all six cards trigger after delivery; overlay bounds match mobile/desktop viewports; replies stay clickable; replay resets; reduced motion is static. Verify in Chromium and WebKit and review the actual Codex preview.
