# Gameplay haptics

The independent vibration control in the contact header saves `mistakery.haptics` as `on` or `off`. Sound keeps its existing preference. Haptics default on when `navigator.vibrate` exists; the control is hidden when the API is absent. Storage denial retains the preference for the current page only. The setting is a preference, not a claim that the device has vibration hardware.

| Event | Pattern (milliseconds) | Moment |
|---|---|---|
| Accepted gameplay reply | 8 | After choice validation and one route resolution |
| Successful deal | 12, pause 55, 12 | Once the outcome messages have finished revealing |
| Failed story or lost attempt | 35 | Outcome reveal, visible resource-defeat presentation, or immediate game-over summary |

Immediate results replace a simultaneous choice cue. A result already playing cannot be replaced by a lower-priority choice. Delayed results do not disclose the outcome during typing. The congratulations modal does not repeat the success cue. Introduction, Saved messages, incoming/outgoing automatic messages, history, free dismissal, and navigation do not request haptics.

Only accepted choices arm their resulting state for outcome feedback. Existing snapshot event tracking prevents repeats after render or Back; Continue explicitly suppresses restored feedback. Disabled/locked input never reaches the cue. Hidden documents discard cues and cancel active patterns; pagehide, navigation, preference disable and save conflicts also cancel feedback. Enabling the setting never plays a sample or retries a refused event. No switch/label workaround is used.

## Verification

- `node --test tests/haptics.test.cjs`: 6 passing tests. Nonfunctional controller stubs produced expected assertion failures before implementation. Covers patterns, priority, preference/storage, cancellation, visibility, missing/throwing/refused API and no retries.
- `node --test tests/haptics.browser.test.cjs`: 6 passing tests across Chromium and WebKit. The accepted-choice test first failed against the unconnected app. Uses actual gameplay handlers with repeatable story outcomes; checks delayed reveals, instant IRL and Judgment Day results, resource defeat, blocked choices, render/Back, hidden results, congratulations, independent controls, reload/Continue, absent API and 320px layout.
- Browser instrumentation records requested patterns for semantic assertions; this does not establish physical vibration. Native iframe tests do not stub the API: current Chromium rejects a pre-activation call from an init script, then accepts the game's call after a real tap in the frame. WebKit has no API. Playwright `evaluate()` can grant activation, so it must not be used for the pre-activation probe.
- The iframe uses separate game/host HTTPS origins, `sandbox="allow-scripts allow-same-origin"`, and `allow="autoplay; fullscreen"`. This is an itch-style synthetic wrapper, not proof of the live itch parent or a physical Android device.
- Automated browser verification uses `NODE_OPTIONS=--require=./qa/safari-audio-2026-10-19/silent-output.cjs`, which blocks real PostHog traffic and disconnects hardware audio output while preserving the Web Audio engine. This QA file remains local and is excluded from runtime packages.

Run the required full suite with that preloader before release. The current full-run result is recorded in the project handoff and PR.

## Browser/device limits

The [Vibration API specification](https://www.w3.org/TR/vibration/) defines duration patterns, visibility and sticky activation, and allows a browser to refuse a request. It provides no amplitude control or confirmation that vibration hardware moved. WebKit opposes this API and does not implement it; Safari/iPhone therefore receives no vibration through this feature.

Current [Chromium vibration code](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/modules/vibration/vibration_controller.cc) checks sticky activation for the frame, including a cross-origin frame, rather than an unconditional cross-origin ban. A true return value in desktop Chromium still does not establish hardware output. Device/browser settings and embedding restrictions may prevent vibration; the game continues normally without a fallback.

On a supporting Android browser, verify one accepted reply, a delayed success/failure, an immediate Padel result, the independent off/on preference after reload, and the live itch embed. Verify that rapid blocked taps and a hidden page stay quiet. Physical output and the live itch parent remain device/release checks.
