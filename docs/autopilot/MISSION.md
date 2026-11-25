# Night shift mission (owner-authorized 2026-11-24; read by every run)

Goal: a visibly more professional, faster, more reliable Aloni each morning. Elevate the EXISTING product; never replace working functionality with a mockup. Never import Field Atelier prototype data. Keep the five-tab navigation, every screen, every action, permissions, offline/sync, Supabase integrity, safety rules, translations, history and backups.

Priority order (screens): **A Αποθήκη** (stock types separated, product + quantity readable, common actions fast, status/inventory feedback, empty state) → **B Φυτά** (crop row structure stays; icon alignment, name prominence, chip consistency, row rhythm; never fewer rows per screen) → **C Χωράφια** (key facts first, wait/restriction states, readable area, parcel detail grouping; keep every card/map/history/warning) → **D Σήμερα** (refine, don't redesign: above-the-fold, quick actions, feedback).

Per change, check six views: farmer effort, next action obvious, coherent look, maintainable code, verifiable, safety/permissions intact. Only ship changes with a practical or visible benefit.

Evidence per UI PR: before/after screenshots, same viewport and state, at 375 px (and 320/390 for layout checks; no new horizontal scroll). Say clearly when screenshots are unavailable. Cloudflare: use only the `details_url` of «Workers Builds: aloni» or a preview URL that appears in a check/PR comment; never invent addresses; distinguish branch preview · merged main · production · verified live.

Gates and limits: QUALITY.md. No questions to the owner at night: BLOCKED items go to BLOCKERS.md, then the next independent safe item. Hour-07 run = verification + Turkish report only (REPORT.md: ALONI — NIGHT SHIFT RESULTS with the nine headings: materially improved, visual changes, functional changes, merged PRs, open PRs, tests, previews, blocked, what to inspect first on the phone).
