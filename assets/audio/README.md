# Approved sound assets

All seven recordings are CC0-1.0. Source URLs, authors, source hashes, processing and the exact approved PCM hashes are in `sources.json`; the official Kenney pack license is preserved in `Kenney-LICENSE.txt`.

- Incoming B: deadrobotmusic, Notification Sound 1, Freesound 750607.
- Send, story loss, AI finale, story win: Kenney, Interface Sounds 1.0.
- Resource loss, variant 1: KevinVG207, Wrong Buzzer, Freesound 331912.
- Padel P1: Luisa_Sanchez, Padel, Freesound 813413, excerpt 4.28–4.64 seconds. The recording does not specify the exact struck surface.

CC0: https://creativecommons.org/publicdomain/zero/1.0/
Legal text: https://creativecommons.org/publicdomain/zero/1.0/legalcode

The owner approved these samples on 2026-10-10. Each WAV preserves one exact approved cue at its auditioned gain, 48 kHz mono PCM16, without pitch, speed or EQ changes. Audition padding and repetitions are removed. Credits are retained voluntarily; CC0 requires no attribution.

`node scripts/build-offline-deck.cjs` embeds their PCM into `assets/sound-samples.js` for both hosted and direct file:// play. Runtime never downloads third-party audio. New or changed sounds require owner audition approval before integration.
