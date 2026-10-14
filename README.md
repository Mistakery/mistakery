# Mistakery

Browser game about a startup trying to find its first paying customer. Open `index.html` directly; the game needs no server or build step.

- [Play from the beginning](https://mistakery.github.io/mistakery/).
- The shared route test entry is `?test=route`: it starts at Saved 01 and then uses the regular plot/filler route. Add `&seed=14` (or any seed) for repeatable review; the matching regular entry is `?seed=14`.
- [Open the Live AI Agent test version](https://mistakery.github.io/mistakery/?story=live-agent) directly, with Back and Restart controls.

Each attempt shuffles Live Agent, Influencer and Padel once, with two gaps of 4–5 played fillers. A gap includes at most one linked episode; its immediate continuation counts as a card. Six resource losses now end the run after a plot outcome is acknowledged or a filler unit finishes: Cash 0, Team 0/100, Customers 0, Founder 0/100. Judgment Day ends immediately. There is no Last Chance in this trial. Resource defeats retain their character reaction and b2buddy finale. Never again finishes the attempt; Let’s cook starts a fresh one. Judgment Day offers Finish and Play again.

Every gameplay reply costs exactly 0.5 Cash for time, including outcome acknowledgements. Padel and investor replies have no additional time/runway charge. Explicit spending, refusal penalties, payouts and outcome losses apply separately. The HUD shows 0–100; a signed balance retains all costs and gains within an episode, so payment must cover earlier losses below zero. Cash/Customers 100 have no selected ending in this trial. After the third plot is acknowledged, the route ends with a neutral Run complete summary, not an overall victory. Resource defeat takes precedence on that final reply. There is no second cycle. The summary lists story results and decision count, with Finish and Play again. Finish keeps the ended attempt on screen; only an explicit replay starts another. A final successful story still shows its existing congratulations before the summary.

**Play again / Let’s cook** skip the introduction and Saved messages and create a fresh attempt, with a new seed and a different opening plot. It remembers the eight most recently viewed filler units in the open game and gives them 20% of their otherwise-computed draw weight. These are preferences, not bans: world gates and immediate linked follow-ups still apply. An explicit URL seed pins only the first attempt; reloading the page resets this session memory.

**Relaunch** during play also creates a fresh attempt, through Saved messages.

**Restart story** in the test toolbar replays the current attempt exactly, including its starting layout and filler memory. **Back** restores resources, the random position and the attempt's starting snapshot, even across a replay transition. Saved messages cannot reshuffle or reset a prepared attempt.

Refusing the opening offer in Padel or Influencer costs 15 Cash. From the normal 25 Cash start, the refusal and outcome acknowledgement leave 9 Cash. Live Agent keeps its intentionally surprising consequences; no new stories are planned before the human playtest.

[Resource-ending verification and replayable examples](docs/qa/resource-endings.md) explains the current resource values, observed balance and paths to every selected ending. Regenerate it with `node scripts/check-resource-endings.cjs`.

## Source of truth

- `cards.json` holds the game deck and English copy. `cards.bundle.js` is its generated offline copy.
- `MISTAKERY_CARDS_EN_RU.md` is the generated bilingual catalog.
- New browser modules live under `assets/`, which the Cloudflare preview publishes recursively.
- `assets/route.js` owns finite plot order, filler eligibility, seeded selection and story handoffs. `game.js` supplies resource accounting and the archived deck runtime.
- `docs/core/` holds current world, character, tone, and rejected-pattern guidance. The character source PDF is in `docs/source/`.
- `assets/*.webp` are used by the game. The three Padel/CEO PNGs are high-resolution image originals; Phosphor icon attribution is in `assets/icons/PHOSPHOR-LICENSE.txt`.

After changing the deck or runtime, run `node scripts/build-offline-deck.cjs`. After changing card copy or translations, also run `node scripts/build-card-catalog.cjs`.

## Checks

Use Node.js 20 or newer. Run `npm ci`, then `npm run test:unit` for the fast data and runtime checks. Install the Playwright browsers with `npx playwright install chromium webkit`, then run `npm test` for all current checks, including browser coverage.

## Working together

Ask an agent to make one change in a new branch and open a pull request to `main`. Cloudflare Pages adds a separate preview link to the pull request; add `?test=route` for the full route or `?story=live-agent` for a direct Live Agent entry. Request fixes in the same pull request so the preview updates. Merge only after the game looks right and the test check passes. The merge updates the main GitHub Pages site; delete the task branch afterward.
