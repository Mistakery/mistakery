# Approved sound set · 2026-10-10

The owner approved incoming B, padel P1, and all five event samples before integration. These are recorded CC0 clips at exactly their auditioned gain and speed, replacing the rejected synthetic cues. There is no separate message/notification volume rule. `assets/audio/sources.json` records authors, source URLs, license verification, processing and hashes; the official Kenney license is preserved alongside the WAVs.

| Event | Approved clip | Trigger |
|---|---|---|
| Incoming | B: deadrobotmusic, Notification Sound 1 | Actual fresh incoming message/image/system delivery; one cue per reveal-all batch |
| Send / choice button | Kenney maximize_008 | One accepted reply/choice, including Intro/Saved/resource-loss replies and finale choices; no second cue when the reply animation finishes |
| Story loss | Kenney error_008 | Failure/catastrophic outcome entrance, including Judgment Day |
| Resource loss | Kenney minimize_006 | Resource defeat after the document card finishes delivery |
| Final AI bot card | Kenney question_004 | @b2buddy finale popup |
| Story win | Kenney confirmation_001 | Existing successful story outcome; no new overall winning ending |
| Every IRL padel card | P1: Luisa_Sanchez, Padel | One impact per fresh IRL card, including outcome cards |

Story outcomes use their result signal instead of also emitting B. For IRL padel outcomes, P1 plays first and the result starts 360 ms later, after the impact. Resource defeat waits 450 ms after the last incoming delivery; the finale waits 230 ms after the accepted reply so the short clips do not stack. The ball recording does not specify the exact struck surface. Messenger padel invitations/refusals retain their messenger/result cues.

Ordinary controls (inspect, close, Back, restart and sound toggle), hover, resource motion, typing and the founder's automatic outgoing bubbles remain quiet. No music or random pitches. The approved timbre, pitch, playback rate and gain are preserved; only audition silence/repetitions are removed.

The speaker button retains aria-pressed, accessible label and tooltip. Audio defaults to enabled, but the AudioContext is created/resumed only after activation. Mute cancels active and scheduled clips immediately and persists `mistakery.sound=off`. Hidden tabs discard both immediate and scheduled audio, with no playback when returning. Audio/storage errors cannot block play.

`assets/sound-samples.js` embeds the exact approved mono PCM16 at 48 kHz. `node scripts/build-offline-deck.cjs` generates it from the WAVs and refreshes content-hashed runtime URLs. Direct `file://` play uses the same buffers without fetch, external audio requests or async decoding. The single master gain does not alter the auditioned levels except for muting.

Played event keys belong to each state in a WeakMap; Back snapshots/restores them together with delivery progress. Rerender and Back do not replay arrivals/results. Genuinely new messages in an unfinished delivery can still sound; a new attempt has new presentation keys. Audio never changes choices, RNG, text, resources or delivery timing.

Verification: `tests/sound.test.cjs` covers PCM decoding, activation, mute, scheduled cancellation, hidden tabs, unavailable audio and denied storage. `tests/offline.test.cjs` checks cache URLs and source/bundle PCM integrity. `tests/sound.browser.test.cjs` checks actual AudioBufferSource playback in Chromium/WebKit, all seven event mappings, every IRL padel card, a real retained reply, deduplication, Back and persisted mute. Full `npm test` remains required.
