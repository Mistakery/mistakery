# Story and filler route implementation plan

**Goal:** Share Saved → three shuffled plots → two 4–5-card filler gaps between regular play and `?test=route`.

**Architecture:** A pure `route.js` state machine owns the seeded plot queue, hidden scores, world facts and filler selection. `game.js` remains the resource/choice primitive and supports archived cards; `app.js` renders the active route and restores complete snapshots. Existing message presentation is unchanged.

**Tech stack:** Plain browser JavaScript, JSON deck, Node test runner, Playwright Chromium/WebKit.

1. Add failing route tests covering all six permutations, seeded replay, each conditional link, 4–5 played fillers, no repeats, event gates, outcome accounting and resource limits.
2. Add the 7 linked episodes (15 cards) and 10 singles from the full Google document, plus six existing OPEN cards. Add authored metadata, source-backed RU text and needed media. Preserve effects except documented corrections needed for world consistency.
3. Implement route state and constrained weighted selection. Pick one linked entry per gap, resolve its chosen follow-up immediately, then singles until the sampled 4/5 target. Track all selected units and played cards. Weight author/theme variety, next-plot affinity and worst-branch resource cost; hard world conditions never relax.
4. Replace browser hard-coded plot handoffs with route resolution. Regular intro and test Saved entry share the exact route; preserve direct `?story=live-agent`, 1000 ms Saved delivery, Back/Restart and the four approved stitched animations.
5. Add browser regressions for both entries, all orders, timers, route snapshots, repeated cycles and content/media. Update obsolete routing assertions, regenerate offline files/catalog, run full `npm test`, inspect mobile screenshots.
6. Review the diff, commit/push only `story-filler-route`, create a separate draft PR into main, verify Cloudflare against exact SHA, update root PROJECT_STATUS.md.

## Infinite cycles and current rules

Owner clarified during implementation: the prototype must remain infinite. No resource boundary or plot outcome ends play. After the third plot, a new seeded permutation and fresh filler pool start immediately; the first plot cannot equal the plot just completed. There are two 4–5-card gaps inside each three-plot cycle. Cards and linked units do not repeat inside that cycle; the next cycle can reuse eligible units.

Resources, accumulated world facts, choice history and random-generator position survive cycle rollover. `shown` and filler-unit bookkeeping reset, while `cycleStart` scopes presentation checks so repeated cycles retain the approved typing and arrival animations. Back restores the complete pre-rollover state. Restart returns to Saved 01 with the same seed and initial world/resources.

Resources remain clamped to 0–100 with −0.5 Cash per decision and disabled crises, as in the current prototype. Payment flags are factual eligibility inputs, not win conditions. Judgment Day retains its image and total resource loss, but is explicitly a simulation that consumed the company's resources; the world remains playable.

No production publication, merge or alteration of an existing PR is authorized.

## Source audit

Source: https://docs.google.com/document/d/1EPNS9F1Mqv0Nk7j5Z8o6VEzy5dAYHBGx3yQghvE1Oos/edit . Read in full through Google Drive on 2026-09-29; revision ANLCKQl9A0QCjO6lIxI_DReMkqVB_nnEEqbw3afXkbiT-irleSc0UsL3g-Xv_IH8u6eKaBTfGJNEaf8xTeTj_4B1DheXpNRHdn7P8OHFVdY.

- Seven linked units, 15 physical cards (coma has two exclusive follow-ups), ten singles. Existing OPEN_01 + OPEN_02a/b is an eighth linked unit; OPEN_BOSS, OPEN_DEV and OPEN_INVESTOR are singles.
- Zero-client OPEN chain and investor complaint require no commercial customer. Payroll AI chain and the pre-revenue OPEN continuation also exclude a completed paid opt-out. Follow-ups require the exact selected parent branch, not just a loose event flag.
- Free-user complaint needs an explicit free-user event; influencer traffic alone is insufficient. Sales opt-out needs a previously sent pitch; its money never establishes product proof.
- Fridge needs an explicit smart-fridge integration; domain resolution restores the site; the black-square redesign affects only the landing page, with the demo and checkout explicitly retained. Video chain requires an explicitly recorded pitch sent with the Influencer demo, with a locally authored non-explicit video screenshot because the document contains only a textual media marker.
- Normalize @error_404 references to the current @error404 identity in new copy. Correct the mismatched RU answer in Mom/investor B. Supply RU translations where the source omits them and fix MANTRAL → MANTRA.
- Story openers must work independently, including after previous sales: references to zero sales become specific to the current campaign, and Padel's “first big client” becomes a prospective deal. Existing plot effects and probabilities stay intact; cash-positive product outcomes explicitly acknowledge payment in copy.
- Keep existing portraits, message layout, shadows and photo sizes. College rival/free-user currently have no portrait assets; retain their existing initial avatars rather than invent replacements for approved characters.
