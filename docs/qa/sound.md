# Messenger sound · 2026-10-10

The regular game uses three short, quiet synthesized sine cues: a 45 ms bubble pop for buttons, a familiar ascending two-note ding-ding (A5 → D6, 255 ms) for incoming messages, and a lower descending two-note warning (E5 → C5, 310 ms). These require no downloads and work with the offline entry. Fixed musical intervals and short envelopes give each event a recognizable messenger meaning; there are no random pitches. Web Audio was chosen over recorded assets (extra requests/licensing) and browser media elements (less reliable short overlapping cues).

The speaker button occupies the existing trailing slot in the contact header. It exposes its current state with aria-pressed, a label and a tooltip. Sound defaults to enabled but the AudioContext is created/resumed only after user activation. Muting silences the active master gain immediately and stores `mistakery.sound=off`; storage/audio errors fail quietly. Hidden tabs omit cues and never queue them for later.

Incoming cues follow actual delivery, including image bubbles and team messages, and exclude outgoing replies and IRL dialogue. Reveal-all emits one cue for the batch. System events, outcome entrances, defeat and the final popup use the alert cue. Saved notes are the founder's own notes and do not trigger incoming sounds. Resource animation and hover remain silent.

Played event keys belong to a state in a WeakMap; Back snapshots and restores these keys along with delivery progress. Rerender never restarts a sound. An unfinished delivery may still announce its genuinely new messages. Restart creates a new presentation. Audio does not change route resolution, RNG, copy, resource accounting or delivery delays.

Verification: `tests/sound.test.cjs` covers activation, mute, storage, hidden tabs and unavailable audio. `tests/sound.browser.test.cjs` exercises real AudioContext oscillators in Chromium/WebKit, incoming delivery, rerender, Back, defeat, finale and persisted mute. Existing game checks remain required via `npm test`.
