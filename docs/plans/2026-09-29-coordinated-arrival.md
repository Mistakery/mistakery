# Approved E arrival integration

The owner approved E ("Вместе") on 2026-09-29. This implements that choice in the existing `chat-typing` branch / draft PR #3, based on `character-avatars` and dependent on PR #2. Neither PR is authorized to merge yet.

## Motion

`app.js` measures the visible rows before delivery and the last existing row after the normal layout/scroll adjustment. Existing messages, the player's retained reply, the incoming whole bubble and the next typing row share that local vertical displacement, one timeline start, 200 ms and `cubic-bezier(.2,0,0,1)`. Only incoming bubbles fade. There is no scaling, bounce, frame counter or extra animation library. The single-message fallback uses the difference between bubble and typing-row heights, as in E.

The old independent CSS entrance is removed synchronously after the layout measurement, before the browser paints the coordinated animation. Initial card entrances, the stylesheet, all markup and typing-dot animations remain unchanged. This preserves the prototype's final layout and avoids double movement.

Tracked animations are cancelled on user input, resize, rerender/navigation, reveal, and changes to reduced motion. Automatic arrival motion is bypassed while reading history or when reduced motion is enabled. Delivery deadlines, decoding/preparation and the existing reveal/Back/Restart/revisit behavior remain intact.

## Compact reading pauses

An ordinary boundary allows time to take in the **previous** bubble:

| Previous bubble | Pause |
| --- | --- |
| Up to 12 whitespace-separated words | 500 ms |
| 13–28 words | 700 ms |
| More than 28 words, photo or media placeholder | 900 ms |
| Next team author differs | Add 100 ms |

Only message paragraphs count; names/roles do not. Explicit authored pauses take precedence unchanged. This is a bounded reading beat, not a typing-speed simulation. The first bubble of a multi-message card and outgoing messages remain immediate; a single incoming text retains its 500 ms lead-in.

Representative whole-card waits: LIVE_AGENT_01 1.8 s; LIVE_AGENT_03 3.5 s; LIVE_AGENT_05 3 s; LIVE_AGENT_07 2.9 s (including the original 2 s before the photo); LIVE_AGENT_07B 1.75 s; INFLUENCER_02 1.6 s; INFLUENCER_05 1.7 s. All other active cards complete within 2.5 s. Narrative, authored pauses and game effects are unchanged.

## Verification

`tests/coordinated-arrival.browser.test.cjs` checks Chromium and WebKit, five screen profiles (320px phone, 390px phone, tablet, desktop, touch landscape), pixel densities 1/2/3, eleven scenes including all four retained-history transitions and a single incoming bubble. Each arrival is sampled at 0/50/100/150/200 ms for equal displacement, unchanged gaps, common timing and no scaling. It also checks cancellation, reduced motion, reading history and exact representative pause deadlines.

Existing delivery tests cover all 52 active cards, reveal without a choice, Enter/Space, deadlines through rerenders, history scrolling, Back/restart/revisits and photo captions. Portrait containment checks wait for finite arrival animations to settle, excluding infinite typing dots. Full acceptance command: `npm test`. Regenerate offline asset hashes with `node scripts/build-offline-deck.cjs` after runtime changes.

These are browser emulations. No physical iOS/Android devices or actual 60/120 Hz displays were tested. Timing and easing are time-based; real frame smoothness remains hardware-dependent.
