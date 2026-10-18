# Mistakery

Browser game about a startup trying to find its first paying customer. Open `index.html` directly; the game needs no server or build step.

- [Play from the beginning](https://mistakery.github.io/mistakery/).
- The shared route test entry is `?test=route`: it starts at Saved 01 and then uses the regular plot/filler route. Add `&seed=14` (or any seed) for repeatable review; the matching regular entry is `?seed=14`.
- [Open the Live AI Agent test version](https://mistakery.github.io/mistakery/?story=live-agent) directly, with Back and Restart controls.

Each attempt shuffles Live Agent, Influencer and Padel once, with two gaps of 4–5 played fillers. A gap includes at most one linked episode; its immediate continuation counts as a card. Six resource losses now end the run after a plot outcome is acknowledged or a filler unit finishes: Cash 0, Team 0/100, Customers 0, Founder 0/100. Judgment Day ends immediately. There is no Last Chance in this trial. Resource defeats retain their character reaction and b2buddy finale. All production endings offer Back to 9–5 and New run. The document-only loss preview retains its original dialogue labels.

Every gameplay reply costs exactly 0.5 Cash for time, including outcome acknowledgements. Padel and investor replies have no additional time/runway charge. Explicit spending, refusal penalties, payouts and outcome losses apply separately. The HUD shows 0–100; a signed balance retains all costs and gains within an episode, so payment must cover earlier losses below zero. Cash/Customers 100 have no selected ending in this trial. After the third plot is acknowledged, the route ends with a neutral Run complete summary, not an overall victory. Resource defeat takes precedence on that final reply. There is no second cycle. The summary lists story results and decision count, with Back to 9–5 and New run. The result stays until the player explicitly leaves or starts another attempt. A final successful story still shows its existing congratulations before the summary. Three distinct successful stories unlock a founder profile instead: b2buddy offers Reveal, then a standalone collectible card appears. Its type is based on the three stories’ decisions (fillers do not count). Reveal is free; the card stays until Back to 9–5 opens the title screen or New run creates a fresh attempt. Touch or drag the card to move its foil highlight; reduced motion is respected.

**New run / Play after quitting** skip the introduction and Saved messages and create a fresh attempt, with a new seed and a different opening plot. It remembers the eight most recently viewed filler units in the open game and gives them 20% of their otherwise-computed draw weight. These are preferences, not bans: world gates and immediate linked follow-ups still apply. An explicit URL seed pins only the first attempt; reloading the page resets this session memory.

**Back to 9–5** opens a Quit / Cancel confirmation when leaving an unfinished attempt with gameplay decisions. Cancel and Escape preserve the attempt; Quit opens the Mistakery logo and Play screen. Finished attempts need no confirmation. Play starts a fresh attempt immediately, without onboarding or Saved. The first page load still starts with onboarding and both Saved screens. No progress is stored across reloads; only the sound preference persists. Escape from a production resource-loss finale opens an actionable summary instead of leaving disabled replies.

**Restart story** in the test toolbar replays the current attempt exactly, including its starting layout and filler memory. **Back** restores resources, the random position and the attempt's starting snapshot, even across a replay transition. Saved messages cannot reshuffle or reset a prepared attempt.

Refusing the opening offer in Padel or Influencer costs 15 Cash. From the normal 25 Cash start, the refusal and outcome acknowledgement leave 9 Cash. Live Agent keeps its intentionally surprising consequences; no new stories are planned before the human playtest.

[Resource-ending verification and replayable examples](docs/qa/resource-endings.md) explains the current resource values, observed balance and paths to every selected ending. Regenerate it with `node scripts/check-resource-endings.cjs`.

## Source of truth

- `cards.json` holds the game deck and English copy. `cards.bundle.js` is its generated offline copy.
- `MISTAKERY_CARDS_EN_RU.md` is the generated bilingual catalog.
- New browser modules live under `assets/`, which the Cloudflare preview publishes recursively.
- `assets/founder-profile.js` classifies decisions and gates the three-win reward; its copy lives in `cards.json` under `meta.founderProfile`. `assets/founder-profile.css` and `assets/founder-card-touch.js` render the approved reward.
- `assets/route.js` owns finite plot order, filler eligibility, seeded selection and story handoffs. `game.js` supplies resource accounting and the archived deck runtime.
- `docs/core/` holds current world, character, tone, and rejected-pattern guidance. The character source PDF is in `docs/source/`.
- `assets/*.webp` are used by the game. The three Padel/CEO PNGs are high-resolution image originals; Phosphor icon attribution is in `assets/icons/PHOSPHOR-LICENSE.txt`.

After changing the deck or runtime, run `node scripts/build-offline-deck.cjs`. After changing card copy or translations, also run `node scripts/build-card-catalog.cjs`.

## Checks

Use Node.js 20 or newer. Run `npm ci`, then `npm run test:unit` for the fast data and runtime checks. Install the Playwright browsers with `npx playwright install chromium webkit`, then run `npm test` for all current checks, including browser coverage.

## Working together

Ask an agent to make one change in a new branch and open a pull request to `main`. Cloudflare Pages adds a separate preview link to the pull request; add `?test=route` for the full route or `?story=live-agent` for a direct Live Agent entry. Request fixes in the same pull request so the preview updates. Merge only after the game looks right and the test check passes. The merge updates the main GitHub Pages site; delete the task branch afterward.
