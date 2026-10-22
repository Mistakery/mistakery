# Refusal adjustment for the human playtest

The owner approved audit proposal 1 and confirmed the current three-story version will be tested with people. No new stories are planned.

- Change only INFLUENCER_01.right and PADEL_INVITE.right Cash from -25 to -15. Apply the same value whenever these cards appear.
- Keep the normal start at 25 Cash and every gameplay reply at -0.5 Cash, including outcome acknowledgement. An initial refusal therefore leaves 9 Cash at the next filler; refusal from Cash ≤ 16 can still cause bankruptcy.
- Keep the existing reactions, outcome effects and settlement rules.
- Preserve all Live Agent behavior and copy: non-obvious outcomes following logical choices are intentional.
- Other audit suggestions remain unapproved. Human testing is the next stage; finite completion is not a prerequisite for this prototype test.

Verification: replay both initial refusal branches through their outcomes, refresh the seven resource-ending witnesses, and run the existing full Node/Playwright suite. Historical audit results remain evidence for the earlier -25 deck, not measurements of this adjusted version.
