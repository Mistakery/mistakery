# In-game resource HUD comparison

The owner selected two prototypes for actual playtesting: **Пульс шкалы** (12px bars, 3000ms pulse) and **Живые иконки** (1600ms pulse). Delta numbers, LOW/HIGH text and red end borders were rejected. The two-row design is not being implemented.

Current owner decision: **park the large-icon variant**. Bars are the only active HUD; the switcher is hidden, and legacy `hud=icons` links fall back to `hud=pulse`. Icon markup, styles, animations and switching remain intact. To restore the comparison, set `window.MISTAKERY_FEATURES = { iconHud: true }` before `app.js` loads. Existing icon/switching browser checks opt into that flag; default checks exercise the disabled state.

- Use the exact Lucide wallet/users/heart-handshake/zap paths from the approved prototype: 40px meters, stroke 1.85, pale base fill .22 and colored interior fill .18. The first transfer incorrectly kept the old hollow icons; corrected after owner feedback. Keep labels, palette, story content, ledger, outcomes, attention windows and replay behavior.
- Render both meter representations in persistent HUD nodes; with the icon feature enabled, display one using `hud=pulse` or `hud=icons`. The test toolbar switches the representation in place and updates the URL, without rerendering the card, resetting message delivery, rolling RNG or charging resources. Normal entry keeps the toolbar hidden.
- Animate actual old-to-new fill; acknowledge subpixel and clipped raw changes with one brief icon response. Keep exact ledger feedback in the screen-reader announcement and existing test inspector, with no numeric labels added to the HUD.
- Pulse only the existing near-fatal edges. Cash/Customers high values remain safe. Stop the danger pulse on recovery, reduced motion, hidden/offscreen resources and settled endings.
- Update the existing resource feedback assertions to reflect explicitly rejected text; preserve their ledger, timing, cancellation and RNG checks. Add browser coverage for switching during delivery, real icon fill and both danger/recovery behaviors.
- Regenerate cache versions, run the focused cases and required full suite, inspect both variants at desktop/mobile sizes in Chromium and WebKit, and provide local test links. Do not commit or publish this local trial.
