# Persistent first story victories

User approved: replay the whole game; keep one victory per distinct story across attempts; determine CEO type from the first winning playthrough of each story. No explanatory copy. This supersedes the survivor-only reward experiment. Keep the table removed. No commit/push requested.

- Keep current attempt and persistent victories together in one atomic local checkpoint, with a schema migration from previous local saves.
- Store immutable ordered card/side decisions for the first acknowledged successful outcome of each story. Duplicate victories and subsequent losses cannot replace them.
- Classify the three saved winning histories with the established classifier. Unlock on the third distinct victory, even across attempts; opening the card never resolves/spends another choice.
- Preserve earned card access from the title after New run. Runs that finish without three saved wins return to the title without a results table. Do not add instructional prose.
- Validate stored victory data, preserve old writes on storage failure/conflict, isolate QA storage. QA Back restores its in-memory progression snapshot.
- Test accumulation, immutability, duplicates, failed outcomes, restart/reload, migration, third-win presentation and permanent card access in targeted Chromium/WebKit with sound off before loading. Do not run the full gameplay suite.
