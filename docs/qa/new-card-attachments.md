# Supplied card attachments — 2026-10-14

The owner's five images appear as chat attachments, preserving their complete proportions. Existing startup image preparation handles fetch/decode and the stable unavailable-image fallback; no runtime or layout changes are needed.

| Card | Sender | Attachment | Dimensions | Bytes |
|---|---|---|---|---|
| FILL_THERAPY | @b2buddy_bot | filler-therapy-leak-v1.webp | 960×680 | 25204 |
| FILL_FIGHT | @hustler | filler-founder-fight-v1.webp | 900×900 | 62690 |
| FILL_FRIDGE | @b2buddy_bot | filler-food-canceled-v1.webp | 766×960 | 17674 |
| FILL_MOM_CALL_2 | @unicorn_hunter | filler-mom-missed-calls-v1.webp | 680×960 | 36066 |
| INFLUENCER_OUTCOME_4 | @hype_queen | ai-influencer-promo-comments-v1.webp | 722×800 | 34700 |

The five WebPs total 176334 bytes, reduced from 5679474 bytes of PNG inputs. Versioned names avoid stale image caches. PNG originals remain outside the release checkout. FILL_FRIDGE and FILL_FIGHT move their authored bubbleBreaks from child 0 to child 1 because the image now precedes the text; the original three and two text bubbles remain intact.

The comment-promo success outcome opens Dream Team: the marketer, who already watches comments in INFLUENCER_08, posts her pinned SORRY20 screenshot. The influencer follows with the existing analytics image, claims credit and demands 20%. His two lines, reply buttons, outcome effects, win feedback and branch routing remain intact. Source-audit field indices move by one to keep checking the same independent approved lines and emoji.

Acceptance checks: all five attachments decoded at startup; Chromium/WebKit at 320×650 and 390×844; no cropping or horizontal overflow; replies remain enabled; marketer appears before the influencer; choice/Back/rerender preserve resources and remove stale media; stalled-image fallback remains bounded. Rebuild both the offline deck and bilingual catalog, then run the full test suite before delivery.

The legacy personal-chat copy test now explicitly checks the image-only marketer message plus the same two influencer messages and equivalent analytics asset. Its outcome-6 copy comparison still uses exactly the influencer's two lines; no mechanics assertions were relaxed.

Final local verification: `npm test -- --test-concurrency=6` passed 299/299 in 275.384s with no failures/skips/cancellations. Browser QA passed 20 cases (five cards × two browsers × two viewport sizes), with five prepared attachments, zero transition requests and zero page errors. Independent review found no remaining blockers.
