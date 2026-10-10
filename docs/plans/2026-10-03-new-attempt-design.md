# New attempts and exact test replay

Approved after the owner observed repeating plots/fillers and asked to implement the proposed distinction.

- Start again and the ordinary abandon/restart action create a fresh attempt: a new seed, another opening plot, default resources and cleared company history/flags.
- Remember the eight most recently viewed filler units across attempts in this open game. Weight them at 20% of their otherwise-computed draw weight; never ban them or interrupt a link. No browser storage or new UI.
- A new seed is deterministically derived from the preceding one. An explicit URL seed controls the first attempt; Back can reproduce even the transition to the next one. Avoid repeating the previous attempt's original opening plot, including if that attempt reached later prototype cycles.
- Keep an immutable starting snapshot for the current attempt. Test Restart story restores it, including its filler memory. Test Back also restores which starting snapshot belongs to an attempt.
- Saved only advances presentation and cannot replace a prepared layout with the original URL seed.
- Do not change card copy, resource values, outcomes, death timing or the unresolved ordinary finite-completion rule.

Verification: first reproduce the repeated-seed bug through new unit/browser tests; implement the smallest route/app changes; replay real loss and filler paths in Chromium and WebKit; regenerate cache hashes and reachability report; run the full suite and update the root handoff. Continue the existing local worktree without publishing.
