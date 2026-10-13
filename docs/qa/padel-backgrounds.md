# Padel POV backgrounds

Each of the 12 active on-court cards has its own photographic first-person scene. `assets/padel-backgrounds.js` maps the five match cards and seven outcomes to versioned WebP files. Chat-only invitation/refusal cards retain their messenger layout.

The set is 994,160 bytes total, with a maximum 640×800 resolution. Full-resolution generation originals stay outside the release checkout. The background action is framed below the contact/location capsules; dialogue, score, replies and existing motion remain unchanged.

At startup four low-priority image workers fetch and decode the set alongside existing media preparation. Decoded `Image` elements are retained and inserted directly on each card, including Back and rerender, without another request or decode. Startup waits at most 2.5 seconds for this branch. Failed or not-yet-decoded pictures use the existing court. Late completion is retained for later visits and never swaps the backdrop while the player reads. Leaving IRL removes the image from the scene.

`node scripts/build-offline-deck.cjs` hashes the manifest script along with the runtime. Image names include `v1`; replacing image bytes in future requires a new filename and updated manifest so deployed caches cannot hide the update.

## Verification

- `tests/padel-backgrounds.browser.test.cjs`: exact 12-card coverage, unique images, size budget, manifest-before-app ordering; Chromium/WebKit startup decode, repeated visits, choice/Back, no requests on transitions, cleanup, delayed/failed HTTP requests.
- Existing `tests/irl-motion.browser.test.cjs` and `tests/padel-resources.browser.test.cjs` retain animation, reply, score, resource and RNG assertions.
- Browser review: every scene at 320×650 and 390×844 in Chromium and WebKit. Backgrounds were decoded; dialogue stayed inside the scene; no horizontal page overflow. Physical-phone behavior remains unverified.

Network download time on a cold or slow connection cannot be instantaneous. The retained decode makes prepared in-game transitions synchronous; startup stays bounded and uses the court fallback when needed.
