# Reply punctuation

Owner clarification, 2026-10-14: remove dots only at the end of reply labels. Keep periods between sentences and internal ellipses, including `Still alive. Already stronger`.

The earlier blanket removal also changed `In meetings. Talk later`, `Deal. Just deliver`, `Thx. Water is fine` and other multi-sentence replies. Restored 11 English labels and 11 Russian references from the version before that edit, retaining all words and other punctuation. Closing dots and ellipses remain removed. Contextual, mood and win labels were inspected; they required no internal punctuation restoration.

`cards.json` remains canonical. Rebuilt the offline bundle, cache URL and bilingual catalog. Source-audit normalization now removes only closing button punctuation; its owner override records the clarified scope. Existing message punctuation and image placement are retained.

Verification: 23 focused source/offline/runtime checks pass, including independent source comparison and unchanged mechanics hashes. Chromium/WebKit review passed eight success/failure cases at 320×650 and 390×844 with the exact corrected reply label. The real promo-choice browser test also checks that label on the failed branch, alongside original effects and exact Back state.

Full verification: `npm test -- --test-concurrency=6` passed 302/302, with no failures, skips or cancellations (277.064s). Mechanics and source-text checks passed.

Private evidence: `analysis/2026-10-14-reply-periods/`; originals and screenshots are excluded from the release commit.
