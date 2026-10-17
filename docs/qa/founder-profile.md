# Founder profile reward

The approved collectible appears outside the messenger after all three distinct stories succeed in one attempt. A resource defeat on the last acknowledgement takes precedence. Mixed story results retain the neutral summary; losses retain their existing finales.

`cards.json` → `meta.founderProfile` contains the approved English copy. The description is a soft rounded panel with uniform weight; the footer reads `approved by @b2buddy • Mistakery Game`.

## Classification

Each story contributes one concession/boundary vote. Live Agent uses the final 08 decision, or 07B when 08 is absent. Influencer uses the resolved contextual final terms, including returns from 06 to 05. Padel uses the majority of 04/05/06 with equal weight. Fillers and outcome acknowledgement answers do not count.

| Conceding stories | Card |
| --- | --- |
| 3 | Chief Easy-yes Officer |
| 2 | Chief Elastic Officer |
| 1 | Chief Exceptions Officer |
| 0 | Chief Ego Officer |

No random tie-breakers, fifth type, or sales overlay. `classify()` alone does not grant a reward; `reward()` separately checks run completion and all three successful outcomes.

## Checks

- `npm run test:unit` includes classifier and exhaustive local route coverage.
- `node --test tests/founder-profile.browser.test.cjs` replays real winning routes for all four cards in Chromium and WebKit. No resources, RNG outcomes or victories are fabricated.
- `tests/founder-profile.fixture.json` contains reproducible seeds and decisions. Replay all but the final acknowledgement, then accept the last outcome through the actual UI.
- Browser checks cover Reveal, resource/history immutability, Finish persistence, replay reset, test Back, 320×568 and 390×844 touch layouts, desktop, native tap, keyboard, reduced motion, Chromium native drag and WebKit synthetic drag/cancel.
- `tests/founder-coverage.test.cjs` enumerates 498 local winning branches and 1,728 decision-equivalence combinations/orders. This is a conservative coverage proof, not player frequencies or a count of resource-feasible runs. Removing research-only sales evidence reduces the number of equivalence classes without changing type assignments.

Physical-phone Safari/Chrome and actual itch iframe checks remain manual. On short screens the reward surface can scroll; vertical panning and pinch zoom are preserved.
