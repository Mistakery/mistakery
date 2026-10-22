# Revision pack implementation plan

**Goal:** Apply the nine owner copy/media/ending corrections plus the supplied @yc_founder avatar locally on the existing release branch.

**Architecture:** cards.json remains canonical. Reuse existing image, avatar and new-attempt paths; add line-level bold formatting and scope ending UI to judgment_day. Preserve all mechanics and other finals.

**Tech Stack:** Vanilla JavaScript, JSON deck, WebP/SVG, Node test runner, Playwright Chromium/WebKit.

1. Record exact approved before/after fields and add targeted regression tests; run them before implementation.
2. Optimize the supplied queue and avatar, preserve originals, update canonical EN/RU copy, voice SVG and ending presentation.
3. Keep historical source/deck hashes by reversing only the explicit approved field changes in checks. Regenerate bundle/catalog/cache versions.
4. Run unit/offline/source checks and silent targeted browser checks at 320/390/1280 widths, including both world-ending replies and duplicate-click protection. Inspect screenshots and show local result.
5. Update root PROJECT_STATUS.md. No commit, push, publication or merge is requested.
