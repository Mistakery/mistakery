# Dramatic chat pacing

Owner request: consecutive bubbles need noticeable dramatic pauses. Preserve the accepted message entrance and delayed contextual reactions.

Use deterministic reading time from the previous bubble's text:1100ms through12 words,1500ms through28,1900ms for longer text/media. Add400ms before a new original message,300ms on team author change,200ms before outgoing text. Split parts sharing messageOrigin stay closer together. Explicit authored story timings remain authoritative. No random timing, copy/deck/resource changes or new animation.

DREAM_TEAM after its650ms opening:2200/1100/1100/1800ms between bubbles. Reactions keep their independent1000ms timer. Rerender retains the pending deadline; tap/keyboard reveal and Back remain immediate. Choices become available after the final bubble.

Verify exact boundaries and reaction/rerender independence in dramatic-pacing and coordinated-arrival browser tests, original325ms arrival in message-arrival, actual frame continuity in reaction-layout, and complete npm test. Gameplay tests advance enough controlled time for the new presentation instead of using obsolete compact timing budgets.
