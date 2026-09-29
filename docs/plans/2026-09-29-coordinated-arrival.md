# Approved E arrival integration

The owner approved E ("Вместе") on 2026-09-29. This implements that choice in the existing `chat-typing` branch / draft PR #3, based on `character-avatars` and dependent on PR #2. Neither PR is authorized to merge yet.

## Motion

`app.js` measures the visible rows before delivery and the last existing row after the normal layout/scroll adjustment. Existing messages, the player's retained reply, the incoming whole bubble and the next typing row share that local vertical displacement, one timeline start, 200 ms and `cubic-bezier(.2,0,0,1)`. Incoming bubbles and the next typing row fade in, so the dots do not visibly jump down before moving into place. There is no scaling, bounce, frame counter or extra animation library. When there are no existing messages, the first bubble starts at the measured position of the previous typing row.

The old independent CSS entrance is removed synchronously after the layout measurement, before the browser paints the coordinated animation. Stable isolated stacking contexts keep neighboring bubble shadows off the typing surface when transforms end. Immediate card entrances, markup and typing-dot animations remain unchanged; newly staged first messages use the same E transition. This preserves the prototype's final layout and avoids double movement.

Tracked animations are cancelled on user input, resize, rerender/navigation, reveal, and changes to reduced motion. Automatic arrival motion is bypassed while reading history or when reduced motion is enabled. Delivery deadlines, decoding/preparation and the existing reveal/Back/Restart/revisit behavior remain intact.

## Founder replies

Choosing a reply in a chat first inserts the selected label as a whole blue outgoing bubble. It rises and fades in over 200 ms with the same non-spring easing while existing messages and the incoming avatar move to make room. The sender bubble sits outside the incoming avatar's row. The selected action resolves once after this send beat; incoming deadlines begin with the next card. IRL choices and reduced motion remain immediate.

For the four retained-history continuations, the sent reply and retained messages carry their measured positions into a second coordinated 200 ms transition. The already-sent reply stays opaque. Fitted photo widths transfer with the history and survive rerenders, avoiding enlargement/overlap on small screens. Other conversation changes happen after the outgoing bubble lands.

Choices remain locked during sending. Back, Restart, navigation or rerender cancel an uncommitted send; no effects or randomness have been applied yet. The existing input/resize/reduced-motion handlers can stop the visual movement without duplicating the pending action. Undo snapshots retain the pre-send scroll position. `tests/founder-send.browser.test.cjs` verifies Chromium/WebKit, phones/desktop/touch landscape, first-frame continuity, monotonic movement, avatar ownership, exactly-once choice application, cancellation, reduced motion, and the real 320×568 photo continuation sequence.

## Compact reading pauses

An ordinary boundary allows time to take in the **previous** bubble:

| Previous bubble | Pause |
| --- | --- |
| Up to 12 whitespace-separated words | 500 ms |
| 13–28 words | 700 ms |
| More than 28 words, photo or media placeholder | 900 ms |
| Next team author differs | Add 100 ms |

Only message paragraphs count; names/roles do not. Explicit authored pauses take precedence unchanged. This is a bounded reading beat, not a typing-speed simulation. When the last answered card belongs to a different conversation source, the first incoming text waits 500 ms behind dots and then uses E. A team continuation also gets this lead-in when its first author differs from the previous card’s last author. Other same-author continuations, initial cards with no previous correspondent, photos and outgoing messages remain immediate; a single incoming text retains its existing 500 ms lead-in. Back/revisits do not repeat it; rerenders retain the deadline.

Representative normal-play waits: LIVE_AGENT_01 1.8 s; LIVE_AGENT_03 4 s; LIVE_AGENT_05 3.5 s; LIVE_AGENT_07 3.4 s (including the new 500 ms opening and original 2 s before the photo); LIVE_AGENT_07B 1.75 s; INFLUENCER_02 2.1 s; INFLUENCER_05 1.7 s. Without a preceding conversation, the isolated-card waits remain 3.5/3/2.9/1.6 s for LIVE_AGENT_03/05/07 and INFLUENCER_02. Other isolated active cards complete within 2.5 s; a changed-source opening adds at most 500 ms. Narrative, authored pauses and game effects are unchanged.

## Verification

`tests/coordinated-arrival.browser.test.cjs` checks Chromium and WebKit, five screen profiles (320px phone, 390px phone, tablet, desktop, touch landscape), pixel densities 1/2/3, twelve scenes including all four retained-history transitions, a single incoming bubble and a changed-source opening. Each arrival is sampled at 0/50/100/150/200 ms for equal displacement, unchanged gaps, common timing and no scaling. It also checks cancellation, reduced motion, reading history, exact representative pause deadlines and four real transitions to new correspondents, including opening rerenders/reveal/Back and unchanged same-author/photo entries. It verifies the measured first-bubble origin, a hidden initial frame for the next dots, occasional new-team-author lead-ins, and unchanged opaque typing-surface pixels before/after transforms finish. The shadow check excludes outer blur edges and avatar rasterization, which can vary slightly across compositing layers.

Existing delivery tests cover all 52 active cards, reveal without a choice, Enter/Space, deadlines through rerenders, history scrolling, Back/restart/revisits and photo captions. Portrait containment checks wait for finite arrival animations to settle, excluding infinite typing dots. Full acceptance command: `npm test`. Regenerate offline asset hashes with `node scripts/build-offline-deck.cjs` after runtime changes.

These are browser emulations. No physical iOS/Android devices or actual 60/120 Hz displays were tested. Timing and easing are time-based; real frame smoothness remains hardware-dependent.
