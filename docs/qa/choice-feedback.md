# Immediate choice feedback — 2026-10-11

An accepted choice is already a composed answer. The retained reply now appears fully visible in the same click turn: no founder dots, temporary send bubble, 650 ms typing timer, 200 ms send timer, fade or continuation movement. Separate-thread transitions retain their presentation. Automatic authored outgoing messages (Live Agent, Dream Team, document text/PDF and Saved update) still use their original typing and delivery pacing.

The resolver runs once. Its state, resource feedback and retained reply commit together at click; the existing double-tap lock and delivery gates remain. Back restores the complete pre-click snapshot and RNG, rerender preserves the accepted choice, and restart clears it. Transferred fitted photo widths remain stable in history and on rerender.

Sound is requested directly by the accepted click, independent of manual animation. Priorities are result/finale > send > incoming/ball: a recent incoming cue cannot suppress send. An immediate win/loss/finale overrides send in the same microtask, so one transition produces its main cue. A playing lower-priority cue fades for 10 ms, then send starts without overlap or a queue. Approved PCM/pitch/gain remain unchanged.

Tests cover immediate reply opacity and no animation, source start in the click turn with at most the 10 ms fade, automatic dots/delivery, repeated tap, exact one-time cost/state, Back/RNG, retained Live Agent/Influencer/filler chains, reduced motion and fitted photos. Full and published verification are recorded in root PROJECT_STATUS.md.
