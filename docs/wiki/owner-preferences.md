# Owner preferences (Bora)

Dated; newest last. Each line cites where it is written down.

## Working style

- 2026-11-17 (`CLAUDE.md`, «Who you work with»): Bora is not a developer. Write to him in Turkish, plainly, without jargon: what changed and what to test, not how the code works. He owns every account; Claude never creates accounts or enters payment details.
- 2026-11-20 (`CLAUDE.md`, language table): everything written to Bora is Turkish, short and plain; code, commits, PRs, DECISIONS, reviews and handoffs are English; the app is Greek first. A drift to another language is a bug, fixed in the same turn.
- 2026-11-27 (YONETICI.md §8, PR #600): the runner's report has five plain-Turkish parts (what changed in the app, the benefit, what was tried and failed, recommendation, decision needed), Greek screen names exactly as on screen, and «birleşti ≠ canlıda».

## Autonomy and hard stops

- 2026-11-27 (DECISIONS row «One management system», point 2): Bora asked not to be needed for approvals; record PRs get a mechanical bekçi check instead of his approval, and ANAYASA stays unchanged.
- 2026-11-28 (DECISIONS row «Independent five-part evaluation», this wiki's PR set): Bora delegated the decisions that follow from the 2026-11-28 evaluation to the team: «sorma» (do not ask). Queue items carry that delegation as `onay`.
- 2026-11-28 evening (DECISIONS row «Bora (chat, evening)»): night shift until 2026-11-29 08:00 Athens (cap 24 on 28–29 Nov); weekly audit approved (Monday, see `docs/autopilot/YONETICI.md` «Weekly audit»); new features the team finds necessary may be added without asking, after the product research of 2026-11-28.
- Hard stops stay his (CLAUDE.md «Production rules» 2026-11-20; YONETICI.md «Hard stops» at 682c32d): production and SQL, `supabase/**` merges, anything that costs money, contact with customers or workers, label/dose/PHI values and agronomist [SET] thresholds. Those items wait as `bora-bekliyor` with one line in `bekleyen_kararlar`.

## Product feedback

- 2026-11-27 (DECISIONS row «Farmer and real-user feedback»; queue items is-6, is-7 via PR #620): farmers find Σήμερα too long and repetitive. Keep weather, conditions, the day's cuts, sprays and jobs there; detail belongs in Φυτά (per crop) and Χωράφια (per parcel). Αποθήκη is not useful for their use: it moved from the bottom bar under Άλλα with all its functions (PR #638, 2026-11-28).
- 2026-11-27 (DECISIONS row «Intensive mode», PR #603): Ταμείο crate prices and credit stay phone-only (Dexie), no SQL.
- 2026-11-28 (DECISIONS row «Bora approved four items»): no preference on the duplicated add buttons on Σήμερα, so they stay.
- 2026-11-17 (DECISIONS rows «Parcels», «Plantings», «Label uses»): an ambiguous number such as «1.000» is refused, never guessed.
