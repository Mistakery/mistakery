# Supplied card attachments — 2026-10-14

Four supplied images remain as chat attachments, preserving their complete proportions. Existing startup image preparation handles fetch/decode and the stable unavailable-image fallback; no runtime or layout changes are needed.

| Card | Sender | Attachment | Dimensions | Bytes |
|---|---|---|---|---|
| FILL_THERAPY | @b2buddy_bot | filler-therapy-leak-v1.webp | 960×680 | 25204 |
| FILL_FIGHT | @hustler | filler-founder-fight-v1.webp | 900×900 | 62690 |
| FILL_FRIDGE | @b2buddy_bot | filler-food-canceled-v1.webp | 766×960 | 17674 |
| FILL_MOM_CALL_2 | @unicorn_hunter | filler-mom-missed-calls-v1.webp | 680×960 | 36066 |

The four WebPs total 141634 bytes, reduced from 4896652 bytes of PNG inputs. Versioned names avoid stale image caches. PNG originals remain outside the release checkout. FILL_FRIDGE and FILL_FIGHT move their authored bubbleBreaks from child 0 to child 1 because the image now precedes the text; the original three and two text bubbles remain intact.

The owner removed the comments screenshot from INFLUENCER_OUTCOME_4. The outcome stays in Dream Team with the influencer's existing analytics image and two messages: claiming credit and demanding 20%. The image-only marketer message and its unused WebP are removed, so no empty bubble or startup download remains. Replies, outcome effects, win feedback and branch routing stay intact. Source-audit indices return to messages.0/.1 for the same independent approved lines and emoji.

Acceptance checks: supplied attachments decoded at startup; Chromium/WebKit at 320×650 and 390×844; no cropping or horizontal overflow; replies remain enabled; the influencer outcome has exactly one analytics image and no comments-screenshot request; choice/Back/rerender preserve resources and remove stale media; stalled-image fallback remains bounded. Rebuild both the offline deck and bilingual catalog, then run the full test suite before delivery.

The personal-chat copy test checks the same two influencer messages and equivalent analytics asset. Its outcome-6 comparison still uses exactly those two lines; no mechanics assertions were relaxed.

The five-image integration originally passed 299/299 before the owner's removal request. Fresh verification of the current outcome is recorded in PROJECT_STATUS.md; the old five-image gallery is historical.

Final suite after comments-screenshot removal: `npm test -- --test-concurrency=6` passed 301/301 in 275.925s, with no failures/skips/cancellations. Chromium/WebKit removal checks pass, including the retained analytics, exact undo and zero requests for the removed asset. Visual QA passed four browser/viewport cases with one analytics image and no page errors.

## Investor's four-hour mantra

FILL_MANTRA opens Dream Team with four incoming messages from @unicorn_hunter: the static voice illustration titled **wealth mantra**, followed by three text bubbles. The investor's first line now says **WEALTH MANTRA**, replacing WEALTH MANTRAL AUDIO per the owner's instruction. The play icon, waveform, duration **4:00:00** and 1× speed badge share the white chat bubble. The SVG is 600×180 and 1268 bytes, with no external fonts, scripts or actual audio payload; controls are part of the requested illustration. Existing startup preparation handles fetch/decode. Replies, Founder effects and filler routing remain intact.

Colleagues react with 🙄×3 and 😒×2 to the instruction to listen on repeat, then 🤡×2 to the claim about vibrations. The existing delayed reveal/count growth, snapshots, cleanup and reduced-motion behavior apply; the attachment itself has no reactions.

Source mapping follows the same three independent document lines as messages.1/.2/.3. A wording override records the approved WEALTH MANTRA replacement; the old personal-text join hook is removed. The existing Russian wording already describes the wealth mantra.

Focused verification passed 36/36 (media and reactions in Chromium/WebKit, offline, source audit and personal runtime). Real-frame visual QA passed all four browser/viewport combinations at 320×650 and 390×844, with one startup request, zero transition requests, no horizontal overflow and zero page errors. FILL_MANTRA joins existing media decode/proportions/rerender/restart and reaction lifecycle coverage. Independent review found no remaining blockers.

The added first attachment uses the existing 2300ms media reading beat before the first text, then the original 1500ms text beats. Filler cadence checks now cover four messages with exactly three text bubbles; mobile fade checks sample the first text at its actual arrival. The four updated timing/motion cases passed in Chromium/WebKit without changing runtime delays or weakening animation assertions.

Final full suite after all mantra changes: `npm test -- --test-concurrency=6` passed 301/301 in 275.530s, with no failures/skips/cancellations. Build/cache hashes and staged diff checks passed.
