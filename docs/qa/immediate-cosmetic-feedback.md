# Saved entrance and immediate resource feedback

Owner update, 2026-10-05:

- On entering Saved 02, its first bubble gets the existing 200 ms arrival: a small 16 px upward displacement and fade. Reduced motion uses the fade with no displacement. There is no typing before this first bubble. Rerender and Back do not replay its entrance; the second bubble keeps its existing typing and 1000 ms delivery deadline.
- Retained player replies start resource fill/color feedback in the choice click handler, concurrently with the 650 ms founder typing. The existing 200 ms send remains. Meter feedback is confined to the bar and does not replay on the continuation render.
- The resolver computes one cloned candidate state at the click. Only the HUD shows its resource result immediately; the actual state, ledger, RNG and history remain unchanged until the previous send boundary. Back, rerender and restart discard that pending candidate and restore the current state's meters. The same candidate is committed once after sending.
- Feedback expiry is 1800 ms from the click. Reduced motion shows the immediate static meter values/colors without resource movement. Separate conversations already resolve immediately and retain that behavior.

Verification: both regressions reproduced before the fix in Chromium and WebKit, with normal/reduced motion. Focused checks passed 34/34, covering appearance frames, the unchanged Saved deadline, click-time meter response, unchanged state during typing/send, cancellation, no duplicate charge/animation and existing resource/Saved/outgoing regressions. Full-suite and hosted verification are recorded in root PROJECT_STATUS.md.
