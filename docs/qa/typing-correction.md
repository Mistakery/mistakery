# Owner correction — 2026-10-05

Owner clarified that outgoing animation means the right-side three-dot composition cue from Founder100, not a sideways bubble entrance. Resource feedback should affect only the meter, not a rectangular resource block.

## Final behavior

- Shared team outgoing delivery now starts with Founder dots for 650ms, then uses the original incoming pauses. Founder100's authored timings remain unchanged
- Retained player replies show dots for 650ms before the existing 200ms send/continuation. Reduced motion shows static dots for 650ms and skips movement. Replies leading to separate conversations keep their existing transition
- Saved 01 has no typing; only the separately delivered second Saved bubble has dots during its existing 1000ms deadline. Rerender does not restart the deadline or replay completed delivery
- Removed the newly introduced 18px sideways entrance
- Removed resource block tint/halo and colored label. Red/green signed feedback and the acknowledgement pulse are confined to the meter; ledger, feedback expiry and attention windows remain unchanged
- Composition shares the send cancellation timer, locks replies, records/charges only at resolution and preserves the pre-composition scroll snapshot. Replacing the dots with text measures existing rows before removing the composer, preserving spatial continuity

## Verification

New regression tests first failed for missing dots, whole-resource animation and nonstatic reduced dots. Focused final checks: 40/40 outgoing/resource/chat, 8/8 founder motion, 4/4 outgoing including reduced motion; 5/5 Live Agent/payment/personal-chat timing; 13/13 exact routes/endings/Back. Existing lifecycle and pacing tests updated only where the owner-approved 650ms composition changes expectations; original incoming delays, settlement and geometry assertions remain.

Final npm test: 205/205, zero failed/skipped/cancelled, 245.447 seconds, exit 0 (2026-10-05 10:32 MSK); root PROJECT_STATUS.md; evidence root analysis/2026-10-05-typing-correction/npm-test-final.log. Source-copy mechanical/copy invariants passed separately. Visual Chromium/WebKit 320/390px captures inspected: right-aligned dots, preserved message/avatar layout, no whole-resource rectangle. Demo: root analysis/2026-10-05-typing-correction/demo.gif and demo.webm.

No engine/route/deck/loss asset changes, dependencies, commits, agents or publication in this correction.

The full run exposed old reduced-motion tests reading state before the new 650ms composition ended. Their helpers now await composition; resources, probabilities, exact undo and subsequent incoming deadlines remain asserted. A separate Chromium CSS serialization race was corrected: the reduced-motion assertion checks DOMMatrix.isIdentity, accepting both `none` after fade and an identity matrix during fade without allowing any displacement/scaling.
