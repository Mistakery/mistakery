# Mistakery

Browser game about a startup trying to find its first paying customer. Open `index.html` directly; the game needs no server or build step.

- [Play from the beginning](https://mistakery.github.io/mistakery/).
- The shared route test entry is `?test=route`: it starts at Saved 01 and then uses the regular plot/filler route. Add `&seed=14` (or any seed) for repeatable review; the matching regular entry is `?seed=14`.
- [Open the Live AI Agent test version](https://mistakery.github.io/mistakery/?story=live-agent) directly, with Back and Restart controls.

Each attempt shuffles Live Agent, Influencer and Padel once, with two gaps of 4–5 played fillers. A gap includes at most one linked episode; its immediate continuation counts as a card. Six resource losses now end the run after a plot outcome is acknowledged or a filler unit finishes: Cash 0, Team 0/100, Customers 0, Founder 0/100. Judgment Day ends immediately. There is no Last Chance in this trial. Resource defeats retain their character reaction and b2buddy finale. Resource endings offer Back to 9–5 and New run. The world-destruction ending shows GAME OVER without a title, with Oops and Finally 😍; both start a fresh attempt. The document-only loss preview retains its original dialogue labels.

Every gameplay reply costs exactly 0.5 Cash for time, including outcome acknowledgements. Padel and investor replies have no additional time/runway charge. Explicit spending, refusal penalties, payouts and outcome losses apply separately. The HUD shows 0–100; a signed balance retains all costs and gains within an episode, so payment must cover earlier losses below zero. Cash/Customers 100 have no selected ending in this trial. Story victories persist between full attempts. The first acknowledged success in each of Live Agent, Influencer and Padel stores that story's ordered decisions. Later victories, setbacks and New run never replace those first winning decisions. One victory in each distinct story unlocks the CEO card; its type uses those three saved winning histories with the existing classifier. The third saved victory can unlock the card during a later attempt. Viewing it is free, and Continue resumes the current attempt without another decision or charge. The earned card remains available from the title. Completing an attempt with fewer than three saved victories returns to the title without a results table. Resource losses still end the current company and preserve prior victories. No explanatory copy is added to the game. Touch or drag the card to move its foil highlight; reduced motion is respected.

**New run** skips the introduction and Saved messages and creates a fresh attempt, with a new seed and a different opening plot. It remembers the eight most recently viewed filler units and gives them 20% of their otherwise-computed draw weight. These are preferences, not bans: world gates and immediate linked follow-ups still apply. An explicit URL seed controls only a first attempt without an existing save.

**Local autosave** stores one attempt in this browser, starting at the first playable card and after every accepted decision. Reload opens the Mistakery title with **Continue** only for an unfinished attempt and **New run**. An earned **CEO card** appears below these as a full-width white pill button with the same soft shadow as the primary actions, without an outline. View result and the permanent browser-save caption are removed. Finished attempts cannot be reopened; the earned CEO card remains available. Continue restores the exact route, resources, random position and pending congratulations without repeating a decision. New run asks before replacing an unfinished or unreadable save; completed runs can be replaced immediately. New run replaces the current attempt but preserves first story victories and the earned CEO card. There is no account or cloud sync.

**Back to 9–5** on either introductory Saved screen returns directly to the logo and Tap to play, without confirmation or a premature checkpoint. Tapping again starts the introduction from the beginning. Once gameplay starts, it opens Quit / Cancel: successful saving shows “Your progress is saved.”; unavailable saving shows “Progress couldn’t be saved. Don’t close this tab if you want to continue.” Cancel and Escape preserve the attempt; Quit saves it and opens the title. Entry without a save opens the Mistakery logo and Tap to play. Activating it starts onboarding and both Saved screens, without drawing a new attempt or saving prematurely. Continue is absent until there is an active attempt; with a saved checkpoint, loading opens the return-player menu directly. QA mode retains its isolated exit confirmation. Escape from a production resource-loss finale opens an actionable summary instead of leaving disabled replies.

The checkpoint uses `mistakery.browser-save`, schema 2, with a separate rules version. Current run and persistent victories are written together. Schema 1 local saves migrate acknowledged successes from their stored attempt; obsolete survivor-only rewards are not treated as victories. Corrupt/incompatible data is preserved until explicit replacement. Storage failures show a warning while play remains available; a detected stale-tab write shows one dialog with a full-width Reload button, without a duplicate banner, and does not overwrite the newer checkpoint. This comparison is not a cross-tab transaction lock. QA entries never read or write the player slot. Browser storage belongs to the site's origin: clearing site data, changing browser/device/domain or private/embedded-browser restrictions can remove or isolate it. Real itch.io iframe and Safari/iOS persistence remain a release check.

**Restart story** in the test toolbar replays the current attempt exactly, including its starting layout and filler memory. **Back** restores resources, the random position and the attempt's starting snapshot, even across a replay transition. Saved messages cannot reshuffle or reset a prepared attempt.

**Gameplay analytics** uses PostHog US Cloud for explicit entry, attempt, choice, story-result and CEO-unlock events. Collection is restricted to published HTTPS itch embeds or explicitly listed release origins; local launches, previews and QA modes are excluded. No new UI, session recording or automatic click capture. See [connection, event definitions and checks](docs/analytics.md). A live API smoke test passed; real itch delivery is still a release check.

Refusing the opening offer in Padel or Influencer costs 15 Cash. From the normal 25 Cash start, the refusal and outcome acknowledgement leave 9 Cash. Live Agent keeps its intentionally surprising consequences; no new stories are planned before the human playtest.

[Resource-ending verification and replayable examples](docs/qa/resource-endings.md) explains the current resource values, observed balance and paths to every selected ending. Regenerate it with `node scripts/check-resource-endings.cjs`.

## Source of truth

- `cards.json` holds the game deck and English copy. `cards.bundle.js` is its generated offline copy.
- `MISTAKERY_CARDS_EN_RU.md` is the generated bilingual catalog.
- New browser modules live under `assets/`, which the Cloudflare preview publishes recursively.
- `assets/founder-profile.js` classifies decisions and collects immutable first story victories and awards the persistent three-victory CEO card; its copy lives in `cards.json` under `meta.founderProfile`. `assets/founder-profile.css` and `assets/founder-card-touch.js` render the approved reward.
- `assets/save.js` validates and writes the versioned local checkpoint; `assets/save.css` styles title actions and storage notices. Bump its rules version for incompatible route/accounting/card-ID/classifier changes.
- `assets/analytics.js` sends explicit gameplay events independently of saves; `assets/analytics-config.js` holds the public project configuration and optional additional release origins.
- `assets/route.js` owns finite plot order, filler eligibility, seeded selection and story handoffs. `game.js` supplies resource accounting and the archived deck runtime.
- `docs/core/` holds current world, character, tone, and rejected-pattern guidance. The character source PDF is in `docs/source/`.
- `assets/*.webp` are used by the game. The three Padel/CEO PNGs are high-resolution image originals; Phosphor icon attribution is in `assets/icons/PHOSPHOR-LICENSE.txt`.

After changing the deck or runtime, run `node scripts/build-offline-deck.cjs`. After changing card copy or translations, also run `node scripts/build-card-catalog.cjs`.

## Checks

Use Node.js 20 or newer. Run `npm ci`, then `npm run test:unit` for the fast data and runtime checks. Install the Playwright browsers with `npx playwright install chromium webkit`, then run `npm test` for all current checks, including browser coverage.

## Working together

Ask an agent to make one change in a new branch and open a pull request to `main`. Cloudflare Pages adds a separate preview link to the pull request; add `?test=route` for the full route or `?story=live-agent` for a direct Live Agent entry. Request fixes in the same pull request so the preview updates. Merge only after the game looks right and the test check passes. The merge updates the main GitHub Pages site; delete the task branch afterward.
