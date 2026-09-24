# Working in Mistakery

- Start each task from the latest `main` in its own branch or worktree. Keep one focused task per pull request. Never push directly to `main`.
- Use `README.md` for setup and read the relevant files in `docs/core/` when changing the game's writing or behavior. Leave the original `newsch8l/mistakery` repository untouched.
- `cards.json` is the deck and English copy source of truth. After deck or runtime changes, regenerate `cards.bundle.js` with `node scripts/build-offline-deck.cjs`. After card copy or translation changes, also regenerate `MISTAKERY_CARDS_EN_RU.md` with `node scripts/build-card-catalog.cjs`.
- Run `npm test` before presenting a game change. Install dependencies with `npm ci` and Playwright browsers as described in `README.md` when needed. Check the changed path in a browser; use `?story=live-agent` for Live Agent work.
- Open a pull request into `main`. Explain the visible result, include the Cloudflare preview link and test result, and flag anything still uncertain in plain language. Keep revisions in the same branch so its preview updates.
- Let a project owner inspect the preview. Merge only after that owner accepts the result and the required test check passes. Delete the task branch after merging.
