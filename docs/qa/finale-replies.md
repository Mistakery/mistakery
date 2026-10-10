# Resource finale replies

Current source: [Финалы от ИИ](https://docs.google.com/document/d/1X9sowFABpQ8geWHjQoboA0rM7wO8WwvnpQBfAPrX-Oc/edit), read in full through Google Drive on 2026-10-10. The exact revision is recorded in `assets/loss-finale-data.js` and the independent dialogue fixture. This supersedes the older single-message copy snapshot described in `loss-preview.md`.

The shared game/preview callback passes the selected side to the popup. Each ending stores two four-paragraph English responses in left/right order. Preserve the document's words, emoji and paragraph boundaries, subject to the explicit owner overrides below. The document provides one Russian translation per ending, shown in the inspector for both choices without inventing a second translation.

| Ending | Left button → source reply | Right button → source reply |
|---|---|---|
| Cash 0 | Need CEO? → Need CEO? | Never give up! → Never give up! |
| Team 0 | Solo founder! → Solo founder! | Anyone here? → Anyone here? |
| Team 100 | You'll crawl back!!! → You'll crawl back!!! | Report spam → Report spam |
| Customers 0 | VISION MATTERS → VISION MATTERS | Any open roles? → Any open roles? |
| Founder 0 | Bringing you coffee. → Bringing you coffee | Wrong chat → Wrong chat |
| Founder 100 | PRAISE ME → Praise me! | Who's sick? → Who's sick? |

The owner clarified on 2026-10-10 that the four source-card buttons must also be renamed. Use the exact labels above, including uppercase VISION MATTERS and PRAISE ME. Left/right positions are unchanged. The owner subsequently replaced the first PRAISE ME paragraph with “Love the messiah energy! You failed, but your intentions were heroic! ✨”; this explicit owner override supersedes that paragraph of the recorded Doc revision. Terminal periods are removed from all EN/RU finale paragraphs, including before emoji; internal periods and !/? remain. The whole first paragraph uses a larger, muted blue treatment at weight 400, with no forced break after the greeting. The second paragraph has a blue quote rule and italic contrast; the third separates “And honestly?”; a thin divider precedes the invitation. All message text is regular weight. Whitespace collapses at line boundaries, and the last contrast word stays with the em dash. Other wording is unchanged. All other resource-card copy, including the Cash 0 bubbles from 11a6caa, is unchanged.

`tests/loss-finale-branch.browser.test.cjs` checks both replies for all six endings in preview and the seeded gameplay renderer in Chromium/WebKit against independent literal source dialogue. It also checks current RU copy, cancelled/repeated delivery, Escape, repeat render, a single retained reply, disabled source choices and unchanged game state. Existing resource-ending tests traverse real seeded routes and cover both final restart buttons, history/Back, RNG/baseline, fresh attempts and pending delivery cleanup. Existing preview tests cover both dismiss buttons, modal focus, small-screen geometry and normal/reduced motion.

Final buttons still dismiss in preview and start a fresh attempt directly in the game; Escape only dismisses. No route, ledger, settlement, RNG or history changes were made. Full private source documents, local analysis and the dependency symlink stay outside the commit.
