# Finale message design QA

Implemented in the existing Mistakery dialog, preserving its avatar, modal, background and footer. Owner selected the third text layout and requested a larger muted blue opening without bold text.

- Opening: 15.25px, regular weight, #426e99; body: 12.5px
- Four distinct paragraphs; blue quote rule and italic contrast; divider before invitation
- No terminal periods; internal sentence punctuation remains
- Normal whitespace prevents indented line starts; an inline nowrap group keeps the final contrast word with its em dash
- Actual local preview inspected after reloading and choosing PRAISE ME: no leading indentation or isolated dash

Evidence: local `analysis/2026-10-10-finale-replies/finale-wrap-fixed.png` shows the actual running UI. Earlier generated alternatives are concept references only. Private images and analysis remain outside Git.

Browser matrix checks all twelve responses in preview and gameplay, including literal copy, regular weights, opening size/color, paragraph whitespace and one-line word/dash group. Existing modal tests cover small-screen bounds and button behavior.
