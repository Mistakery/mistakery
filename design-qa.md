# Finale message design QA

Implemented in the existing Mistakery dialog, preserving its avatar, modal, background and footer. Owner selected the third text layout and requested a larger muted blue opening without bold text.

- Whole opening paragraph, including its substantive message: 15.25px, regular weight, #426e99; body: 12.5px
- Four distinct paragraphs; blue quote rule and italic contrast; divider before invitation
- No terminal periods; internal sentence punctuation remains
- Normal whitespace prevents indented line starts; an inline nowrap group keeps the final contrast word with its em dash
- The first paragraph flows continuously, with no forced break after the greeting
- Actual local Team 100 left inspected: the entire opening paragraph is consistently larger and blue, with continuous wrapping; no leading indentation or isolated dash

Evidence: local `analysis/2026-10-10-finale-replies/whole-opening-team-high.png` shows the actual running UI. Earlier generated alternatives are concept references only. Private images and analysis remain outside Git.

Browser matrix checks all twelve responses in preview and gameplay, including literal copy, regular weights, whole opening paragraph coverage and size/color, paragraph whitespace and one-line word/dash group. Existing modal tests cover small-screen bounds and button behavior.
