# LIVE rehearsal – two phones, 200 records (2026-11-21)

**What it is:** `app/tests/unit/live-rehearsal.test.ts`. The REAL sync engine, the REAL outbox and two REAL local databases (the second phone is a second database of the same farm) talk to an in-memory stand-in for the server that answers like the real one: one effect per `op_id` (a repeat is «duplicate»), a row = last write wins, pull pages by server sequence. No browser, no network, no real account (the sign-in is not part of this test: the e2e mock-server specs `live-*.spec.ts` cover sign-in and the invitation).

## Results (run on the build machine; the stand-in is instant, so these are PHONE-side times, not network times)
| Scenario | Result |
|---|---|
| 200 records written without signal (20 writes of 10) | 88 ms; all 200 wait in the outbox; the round fails cleanly (no signal), nothing is lost, the records are on the screen |
| Signal returns: one push | 61 ms; 200 sent, 0 refused, outbox empty, the server holds 200 |
| Second phone pulls (pages of 100) | 20 ms to fetch and apply; 200 records, the same ids as phone 1; asking again brings 0 |
| A push cut in half by a dropped signal | resumes; the server holds every record exactly ONCE (no duplicates, `applied` = 200) |
| The same record edited on both phones while offline | the later write wins on the server; both phones end with it; no edit stays unsent; every outbox row «acked» |

Not measured here: real network time (use `scripts/perf/first-open.mjs` for the page; the sync round over a slow link has not been timed), the server's own limits, Supabase auth refresh in the middle of a long round.

## The checklist before «Άνοιγμα συγχρονισμού» (checked against RUNBOOK §13)
The wizard's button opens only when ALL seven are ok: data controller complete · farm name · VAT number · «migration applied up to 0034» confirmed by the owner · Advisor check confirmed · signed in · a fresh backup. That is exactly the order of RUNBOOK §13 steps 1–4. Nothing is missing for the first upload.
**One thing to keep in step:** `EXPECTED_MIGRATION` is `0034`. When a phone change starts to RELY on a newer migration (0036 harvest destination, 0037 owner-only records) the same PR must raise it, so the wizard asks the owner to confirm the new migration. 0035 (hardening) is not relied upon by the phone: no change needed.
