# 0039 day notes · independent SQL review

Reviewed #429 at `3a115b1289d9cd2cc851b9bf638937825f582390`. PostgreSQL 17.11 with the Supabase-layout auth stub. The stacked role, pull and restore checks passed.

## MUST

1. **Keep an existing note in its original farm.** `supabase/migrations/0039_day_notes.sql:29–37,52–54` preserves the worker marker but does not pin `farm_id`. The owner UPDATE policy accepts an owner of both old and new farms. A local authenticated assertion moved the existing worker note from the first fixture farm to the second and preserved its worker attribution. The first farm's incremental pull has no tombstone for that move, and the second farm gains a worker note it did not author. Reject tenant changes in the stamp trigger and cover an owner belonging to both farms. Support explicit copy with new attribution separately if needed.

## SHOULD

- Exercise worker insert and owner confirmation through `apply_ops` as well as SQL and pull. See `supabase/tests/m19_day_notes.sql:10–39`.

## LOW

- Document whether client-supplied note dates can be historical. The table deliberately stores the requested date without substituting a server date.

MUST var – hazır değil
