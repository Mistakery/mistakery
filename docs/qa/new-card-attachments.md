# Supplied card attachments — 2026-10-14

Five supplied images appear as chat attachments, preserving their complete proportions. Existing startup image preparation handles fetch/decode and the stable unavailable-image fallback; no runtime or layout changes are needed.

| Card | Sender | Attachment | Dimensions | Bytes |
|---|---|---|---|---|
| FILL_THERAPY | @b2buddy_bot | filler-therapy-leak-v1.webp | 960×680 | 25204 |
| FILL_FIGHT | @hustler | filler-founder-fight-v1.webp | 900×900 | 62690 |
| FILL_FRIDGE | @b2buddy_bot | filler-food-canceled-v1.webp | 766×960 | 17674 |
| FILL_MOM_CALL_2 | @unicorn_hunter | filler-mom-missed-calls-v1.webp | 680×960 | 36066 |
| INFLUENCER_OUTCOME_5 | @hype_queen | ai-influencer-promo-failed-comments-v1.webp | 722×800 | 34700 |

The five WebPs total 176334 bytes, reduced from 5679474 bytes of PNG inputs. Versioned names avoid stale image caches. PNG originals remain outside the release checkout. FILL_FRIDGE and FILL_FIGHT move their authored bubbleBreaks from child 0 to child 1 because the image now precedes the text; the original three and two text bubbles remain intact.

The comments screenshot belongs to the failed promotion, INFLUENCER_OUTCOME_5. Sales first reports “still zero sales…”; @hype_queen then sends the screenshot with her original comment about selling subscriptions under a scam expose. The image is attached to her existing second message, so authors, two-message structure, copy and source-audit indices are unchanged.

INFLUENCER_OUTCOME_4 is the successful promotion: the returning influencer shows only his existing analytics image and two messages claiming credit and demanding 20%. No comments screenshot or marketer message appears there. Replies, effects, win feedback and branch probabilities remain intact in both outcomes. The wrong original success placement must not be restored.

Acceptance checks: attachments decoded at startup; Chromium/WebKit at 320×650 and 390×844; no cropping or horizontal overflow; replies remain enabled; success has one analytics image, failure has one comments screenshot from the marketer; choice/Back/rerender preserve resources and remove stale media; slow-image coverage includes OUTCOME_5; stalled-image fallback remains bounded. Rebuild both the offline deck and bilingual catalog, then run the full test suite before delivery.

The personal-chat copy test checks the same two influencer messages and equivalent analytics asset. Its outcome-6 comparison still uses exactly those two lines; no mechanics assertions were relaxed.

Current verification is recorded in PROJECT_STATUS.md and analysis/2026-10-14-promo-failure/. The old five-image gallery attached comments to the wrong success outcome; use the current failure screenshots.

Final verification of the correct placement: full `npm test -- --test-concurrency=6` passed 301/301 in 270.166s with no failures/skips/cancellations. Focused branch/media/offline/source/runtime tests passed 35/35. Visual QA passed eight cases (success/failure × Chromium/WebKit ×320×650/390×844), with one prepared comments request, zero requests on card display and no page errors. Failure uses the marketer's screenshot; success uses only the influencer's analytics. Existing source copy, probabilities and effects remain intact.

## Investor's four-hour mantra

FILL_MANTRA opens Dream Team with four incoming messages from @unicorn_hunter: the static voice illustration titled **wealth mantra**, followed by three text bubbles. The investor's first line now says **WEALTH MANTRA**, replacing WEALTH MANTRAL AUDIO per the owner's instruction. The play icon, waveform, duration **4:00:00** and 1× speed badge share the white chat bubble. The SVG is 600×180 and 1268 bytes, with no external fonts, scripts or actual audio payload; controls are part of the requested illustration. Existing startup preparation handles fetch/decode. Replies, Founder effects and filler routing remain intact.

Colleagues react with 🙄×3 and 😒×2 to the instruction to listen on repeat, then 🤡×2 to the claim about vibrations. The existing delayed reveal/count growth, snapshots, cleanup and reduced-motion behavior apply; the attachment itself has no reactions.

Source mapping follows the same three independent document lines as messages.1/.2/.3. A wording override records the approved WEALTH MANTRA replacement; the old personal-text join hook is removed. The existing Russian wording already describes the wealth mantra.

Focused verification passed 36/36 (media and reactions in Chromium/WebKit, offline, source audit and personal runtime). Real-frame visual QA passed all four browser/viewport combinations at 320×650 and 390×844, with one startup request, zero transition requests, no horizontal overflow and zero page errors. FILL_MANTRA joins existing media decode/proportions/rerender/restart and reaction lifecycle coverage. Independent review found no remaining blockers.

The added first attachment uses the existing 2300ms media reading beat before the first text, then the original 1500ms text beats. Filler cadence checks now cover four messages with exactly three text bubbles; mobile fade checks sample the first text at its actual arrival. The four updated timing/motion cases passed in Chromium/WebKit without changing runtime delays or weakening animation assertions.

Final full suite after all mantra changes: `npm test -- --test-concurrency=6` passed 301/301 in 275.530s, with no failures/skips/cancellations. Build/cache hashes and staged diff checks passed.
