# Mistakery

Browser game about a startup trying to find its first paying customer. Open `index.html` directly; the game needs no server or build step.

- [Play from the beginning](https://mistakery.github.io/mistakery/).
- [Open the Live AI Agent test version](https://mistakery.github.io/mistakery/?story=live-agent) directly, with Back and Restart controls.

## Source of truth

- `cards.json` holds the game deck and English copy. `cards.bundle.js` is its generated offline copy.
- `MISTAKERY_CARDS_EN_RU.md` is the generated bilingual catalog.
- `docs/core/` holds current world, character, tone, and rejected-pattern guidance. The character source PDF is in `docs/source/`.
- `assets/*.webp` are used by the game. The three Padel/CEO PNGs are high-resolution image originals; Phosphor icon attribution is in `assets/icons/PHOSPHOR-LICENSE.txt`.

After changing the deck or runtime, run `node scripts/build-offline-deck.cjs`. After changing card copy or translations, also run `node scripts/build-card-catalog.cjs`.

## Checks

Use Node.js 20 or newer. Run `npm ci`, then `npm run test:unit` for the fast data and runtime checks. Install the Playwright browsers with `npx playwright install chromium webkit`, then run `npm test` for all current checks, including browser coverage.

## Working together

Ask an agent to make one change in a new branch and open a pull request to `main`. Cloudflare Pages adds a separate preview link to the pull request; add `?story=live-agent` to that link when checking Live Agent. Request fixes in the same pull request so the preview updates. Merge only after the game looks right and the test check passes. The merge updates the main GitHub Pages site; delete the task branch afterward.
