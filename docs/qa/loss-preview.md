# Document loss-card visual preview

Verified after finale integration: 2026-10-04 19:36 UTC.

These six cards remain an isolated visual preview. Owner now authorized a separate b2buddy popup after either reply; its two choices only dismiss the popup. Ordinary gameplay is unchanged.

Source: https://docs.google.com/document/d/1i2pGj2I90MgzfcHQBQ1EHoyjUWTAFSY-efjmnSJR6xg/edit

Google Docs connector was unavailable to this model. Refreshed the owner's Google Docs browser tab, inspected the complete tab tree (one tab: “Вкладка 1”), exported a fresh DOCX through the browser's Google Workspace export, and read the full document including soft line breaks. Read-only source snapshot: `analysis/2026-10-04-loss-preview/source.txt` outside this checkout. Google Doc and source snapshot remain unchanged. The owner subsequently requested local preview edits to bubble grouping, two added departure events, CV attachment presentation and the shortened Founder 100 speech. Russian text remains the original document translation in RU; revised English cards explicitly explain this provenance in the inspector. The owner also shortened the Customers 0 marketer line, split the Sales question and six-month statement, and removed “on day one” from the developer line, splitting his two sentences. Six-month wording remains unchanged. Cash 0 investor wording is now “WHAT DID YOU DO WITH MY MONEY, IDIOTS??” in one bubble.

## Inventory and links

| ID | Document heading | Chat | Authors/events in order | Replies |
|---|---|---|---|---|
| DOC_LOSS_1 | Исход 1 — Cash → 0 | team | @unicorn_hunter → @unicorn_hunter → @hype_queen → @bigdeals → @error404 | Need CEO? / Never give up! |
| DOC_LOSS_2 | Исход 2 — Team → 0 | team | @hype_queen → @hype_queen → @hype_queen → @hype_queen left → @error404 left → @pixel_perfect left → @bigdeals left → @hustler left | Solo founder! / Anyone here? |
| DOC_LOSS_3 | Исход 3 — Team → 100 | team | @hustler → @hype_queen → @bigdeals → system left | Delete chat / Report spam |
| DOC_LOSS_4 | Исход 4 — Customers → 0 | team | @bigdeals → @bigdeals → @hustler → @hype_queen → @error404 → @error404 | Vision matters! / Any open roles? |
| DOC_LOSS_5 | Исход 5 — Founder → 0 | personal | @you → @business1 → @business1 → @business1 | Bringing you coffee. / Excel 😍 |
| DOC_LOSS_6 | Исход 6 — Founder → 100 | team | @you → @you → @you → @you → @bigdeals → @hype_queen → @error404 | Bless you. / Who's sick? |

All six cards have two authored replies. The initial document supplies no destination for either reply. The owner subsequently supplied the b2buddy finale document and authorized the popup: preview displays the selected reply as outgoing and opens the matching finale over the current card. Five separate leave-channel events in card 2, including @bigdeals and @hustler. Its preview fixture starts at 7 members; the header updates on each visible departure: 7 → 6 → 5 → 4 → 3 → 2. Replay resets to 7. Card 3 retains its removal event. Card 5 contains one outgoing CV attachment with caption, then three separate boss bubbles. Card 6 has four outgoing bubbles; its last combines the erased and Savior statements on separate lines. Pauses are 2.5 s after purpose, 1.2 s after AGI and 2.8 s after god, followed by 1.4 s before the team replies; @all is white/bold on its own line in the first bubble. Its third bubble has an explicit line break after “We birthed a perfect god.”; the second line is “But It is too dangerous for this world.” Default 12 px inner padding prevents edge clipping. Before each founder bubble (including the first and CV), a right-aligned dot-only typing cue appears. No visible author label, send icon or receipt. The existing arrival motion is retained; reduced motion makes the dots static. Tap chat skips pending delivery; replay and navigation clear it. @founder mentions inside other characters' speeches are not outgoing messages.

Each card now finishes with a single 1.3 s full-screen red pulse and the existing short failure jolt. Red edge tint and the failure-colored phone remain afterward. The body overlay covers the entire viewport and passes pointer input through. Replay/navigation reset it; tap-to-reveal also triggers it. Reduced motion retains only static tint. Design: `docs/plans/2026-10-04-loss-flash-preview.md`.

## Open and run

- URL: http://127.0.0.1:8791/?preview=losses&card=DOC_LOSS_1
- Direct IDs: `DOC_LOSS_1` through `DOC_LOSS_6` in the `card` parameter.
- Start from this checkout: `python3 -m http.server 8791 --bind 127.0.0.1`.
- Select a heading, use Previous / Next, RU for the source translation, Replay card to reset its delivery/reply. Tap chat to reveal the remaining messages immediately, or allow normal delivery.

## Isolation

Fixtures live in `assets/loss-preview-data.js`, outside the normal deck. Preview owns its state and replies; it never calls the route resolver, resource settlement, ordinary restart or filler drawing. One boundary resource reflects the document heading; the other resources are neutral 50. The ordinary deck, engine and route hashes still match the pre-HUD snapshot. Default HUD remains bars only. No balance, resource effects, odds or ordinary progression changed; no Google Doc changes, commits, pushes or publication.

## Verification

- Full `npm test`: 187/187 passed, no failures/skips/cancellations, 235.977 s. Root log: `analysis/2026-10-04-finale-designs/npm-test-integration.log`.
- Dedicated preview checks: 6/6 in Chromium + WebKit, included in the full run. Cover both answers on all cards, state isolation, replay/navigation, attachments/mentions/system events/member counts, mobile/desktop geometry, every founder bubble and authored pause, skip/cancellation and reduced motion. New assertions cover all six defeat triggers, full viewport overlay bounds, pointer passthrough, replay reset and static reduced-motion pulse/jolt/local glow.
- Actual Codex HTTP preview: reviewed full-screen red pulse and persistent edge tint on Founder 100; message copy remains readable and the god sentence splits exactly into two lines. Screenshot outside checkout: `analysis/2026-10-04-loss-preview/loss-flash.png`. Tab retained; Replay card repeats the sequence.
- Earlier 12/12 revised card/layout combinations at 320×650 / 1280×900 had no horizontal overflow/header overlap and accessible buttons. CV/boss grouping, @all, four founder bubbles and final two-member status were reviewed; RU translations remain the original source with provenance notes.
- `node --check app.js`, `node --check assets/loss-preview-data.js`, `git diff --check`: passed. Deck, bundle, engine and route hashes still match the pre-HUD baseline.

Initial visual bug: new DOC_LOSS IDs did not match the legacy chat-scroll CSS selectors and could paint over the contact header. Applied the same scrolling policy in preview-only CSS; verified zero overlaps and horizontal overflow after correction.

## Integrated b2buddy finale

Source: https://docs.google.com/document/d/1X9sowFABpQ8geWHjQoboA0rM7wO8WwvnpQBfAPrX-Oc/edit . Read in full (sole Tab 1); original text in `docs/prototypes/finale/source.txt`. Canonical local EN/RU copy now lives in `assets/loss-finale-data.js` and is shared with the comparison prototype. Owner changes: remove the first introductory paragraph and periods before emoji; retain four paragraphs and make the last semibold.

Uses central variant A: avatar and @b2buddy / AI Agent from the game, one chat bubble, Never again / Let’s cook. No Game Over label. Either source-card reply opens the native modal dialog. Both final buttons and Escape only close it; no restart, navigation, cost or state mutation. Original selected reply and loss tint remain visible underneath. The real game screen is the background (no screenshots or duplicate game frames).

The modal blocks background input, scrolls its message when needed and returns focus to Replay card because the answered source choices are disabled. Replay/navigation/render remove the old popup. RU inspector includes the corresponding finale translation and final choices. Ordinary game startup creates no popup.

Dedicated popup/preview checks: 6/6 Chromium + WebKit, including both triggers and dismissals for all six IDs, state equality, four paragraphs, identity, final emphasis, modal focus, Escape, cleanup, small viewport 320×480 and ordinary-game isolation. Full integration suite: 187/187 passed, no failures/skips/cancellations (235.977 s).
