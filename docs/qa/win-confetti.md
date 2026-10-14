# Story victory confetti

Approved prototype: 30 slightly larger, brighter pieces in two fans above the existing @b2buddy popup; maximum 1200 ms. Keep the original blue panel, white message, copy, reply buttons and ai-finale sound. No green styling or square autofocus outline around the non-interactive message body. Keyboard focus rings on replies remain.

The effect starts only after accepting one of the eight success outcomes and surviving resource settlement. Both free popup replies retain the previously resolved route/resources/RNG. No new media or dependencies; particles use deterministic transform/opacity keyframes, independent of gameplay randomness, in the dialog's top layer with pointer-events:none and aria-hidden.

A presentation-only Set keys wins by the pre-settlement seed, cycle and outcome ID, because completing the third plot can advance the route cycle. The ledger is not rewound by Back. Restored pending popups and re-answering the same outcome remain quiet. A fresh attempt seed or new cycle can celebrate again. Reduced motion or hidden-at-open marks the win seen without motion; disabling reduced motion later cannot start a delayed celebration.

A 1200ms timer removes the layer and cancels animations. Closing either reply, Escape, changing view/restarting, pagehide, hidden or enabling reduced motion cleans up immediately. No animation gate delays buttons or continuation.

Regression coverage is in tests/win-ai-feedback.browser.test.cjs for Chromium and WebKit: all eight wins, original text/blue styling, 30 pieces and bounded lifetime, rerender dedup, Back/re-answer/restored pending popup, new attempt, reduced motion toggle, visibility, rapid dismissal, restart and resource-loss exclusion. Existing cases verify both outcome replies and both free replies, exact route accounting, source PCM, absence of next-card delivery behind the dialog, all failures and six resource endings.

Physical-phone performance remains unverified. There is no new global game-completion effect.
