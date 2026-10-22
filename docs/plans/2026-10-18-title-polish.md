# Title readiness and Tap to play

Scope: preserve the owner's PNG, first-entry onboarding/Saved, route, deck and mandatory exit confirmation. Work stays on release/current-game-2026-10-05 / PR #5.

## Evidence before change

A fresh browser context with an intercepted, held PNG response reproduced the defect in Chromium and WebKit: no logo request before Quit; first exit frame had view=title, prompt=true, logo=false. The regression test failed on both engines before implementation. The original PNG is 676 KiB and was discovered only when renderTitle inserted an img.

## Design and implementation

- Preload the original PNG and decode a reusable Image from application startup. Do not gate first-entry onboarding on it.
- Quit waits for that decode before replacing the current view. The existing modal remains cancellable with Cancel/Escape. Ignore async completion if the dialog has been dismissed. A load failure leaves the current run intact and offers a retry in the dialog.
- Reuse the decoded image node on title. Keep the full-screen native button and its focus/Enter/Space semantics. Keep the 280 ms exit guard; ignore double-click events and repeated keydowns.
- Make Tap to play bold, 26–34 px, dark ink with a restrained 2.4 s pulse (4.5% scale / 2 px lift, never invisible). Reduced motion disables the animation. No extra visible button, text or initial splash.

## Acceptance

Cold held response: no incomplete title, Cancel/Escape preserve state and prevent late navigation; first title has a decoded logo. Check Chromium/WebKit, keyboard, edge taps, double taps, reduced motion, mobile/desktop screenshots. Run offline build, npm test and diff check; update PR #5/preview and root PROJECT_STATUS.md.
