# Approved sound set · 2026-10-10

The owner approved incoming B, padel P1, the other event samples, and resource-loss variant 1 before integration. These are recorded CC0 clips at exactly their auditioned gain and speed, replacing the rejected synthetic cues. There is no separate message/notification volume rule. `assets/audio/sources.json` records authors, source URLs, license verification, processing and hashes; the official Kenney license is preserved alongside the WAVs.

| Event | Approved clip | Trigger |
|---|---|---|
| Incoming | B: deadrobotmusic, Notification Sound 1 | Actual fresh incoming message/image/system delivery; one cue per reveal-all batch |
| Send / choice button | Kenney maximize_008 | Accepted reply/choice or actual automatic outgoing text/attachment delivery; suppressed by a simultaneous higher-priority event, never repeated for a retained button reply |
| Story loss | Kenney error_008 | Failure/catastrophic outcome entrance, including Judgment Day |
| Resource loss | Variant 1: KevinVG207, Wrong Buzzer (0.4943 s) | Resource defeat after the document card finishes delivery |
| Final AI bot card | Kenney question_004 | @b2buddy finale popup |
| Story win | Kenney confirmation_001 | Existing successful story outcome; no new overall winning ending |
| IRL padel arrival | P1: Luisa_Sanchez, Padel | One impact per fresh non-outcome IRL card; result overrides impact on an outcome |

The three playback priorities are **result/finale > incoming/ball > send**. Synchronous hooks for one transition are coalesced in a microtask, and only their highest-priority cue starts. A choice that immediately opens a story outcome emits only win/loss, including IRL padel; a resource defeat or AI finale similarly suppresses simultaneous arrival/send. Normal padel cards retain P1. Authored player messages sound on delivery, including consecutive messages and PDF attachments. Their event keys are separate from button replies, which already have a send cue. Reveal-all emits one cue for the last fresh bubble in the batch; it does not play a burst for every revealed message. A reply separated from the next delivery/result by existing game animation keeps its own send cue.

Only one cue can sound at a time. A higher-priority event replaces a playing lower-priority cue: its gain fades to zero over 10 ms and the new cue starts after the old source stops. New equal-priority events replace the old cue; repeated arrivals of the same kind during playback are discarded. Lower-priority events are discarded, never queued or replayed later. The old independent 360/450/230 ms audio delays are removed; visual/gameplay timing is unchanged. Back, replay, restart, document navigation, finale dismissal, mute and hiding the tab cancel pending/active audio. A slow initial AudioContext activation discards feedback older than 150 ms.

The ball recording does not specify the exact struck surface. Messenger padel invitations/refusals retain their messenger/result cues.

Ordinary controls (inspect, close, Back, restart and sound toggle), hover, resource motion and typing remain quiet. No music or random pitches. The approved timbre, pitch, playback rate and gain are preserved for uninterrupted cues; only audition silence/repetitions are removed.

The speaker button retains aria-pressed, accessible label and tooltip. Audio defaults to enabled, but the AudioContext is created/resumed only after activation. Mute cancels active and scheduled clips immediately and persists `mistakery.sound=off`. Hidden tabs discard both immediate and scheduled audio, with no playback when returning. Audio/storage errors cannot block play.

`assets/sound-samples.js` embeds the exact approved mono PCM16 at 48 kHz. `node scripts/build-offline-deck.cjs` generates it from the WAVs and refreshes content-hashed runtime URLs. Direct `file://` play uses the same buffers without fetch, external audio requests or async decoding. The master gain does not alter the auditioned levels except for muting; per-source gain is used only for the short interruption fade.

Played event keys belong to each state in a WeakMap; Back snapshots/restores them together with delivery progress. Rerender and Back do not replay arrivals/results. Genuinely new messages in an unfinished delivery can still sound; a new attempt has new presentation keys. Audio never changes choices, RNG, text, resources or delivery timing.

Verification: `tests/sound.test.cjs` covers PCM decoding, immediate priority selection in either call order, interruption without overlap, repeated arrivals, stale activation, navigation/mute/hidden cancellation, unavailable audio and denied storage. `tests/offline.test.cjs` checks cache URLs and source/bundle PCM integrity. `tests/sound.browser.test.cjs` checks actual AudioBufferSource playback in Chromium/WebKit, all seven event mappings, every IRL padel card, real immediate padel outcomes, a retained reply without duplicate send, automatic team texts, a PDF send and four consecutive automatic messages in real time, source start/stop intervals without overlap, finale priority, deduplication, Back and persisted mute. Full `npm test` remains required.
