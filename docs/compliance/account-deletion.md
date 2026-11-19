# Account deletion – design only (nothing is implemented before LIVE)

2026-11-19. For the lawyer to confirm.

**Worker leaves**
1. Owner revokes the worker in «Εργάτες» (sign-in stops).
2. The auth user and the e-mail are deleted.
3. The `workers` row is pseudonymised by an amending row (name → «Πρώην εργάτης 3»); the ids stay.
4. Spray and harvest rows keep their uuid for 3 years (legal duty, append-only); they then only point to the pseudonym.

**Owner leaves**
1. Export first (backup file + register CSV).
2. Delete every record that is not held by a legal duty.
3. Records held by the 3-year duty are scheduled for deletion on their date; the owner is told which and until when.

**Public page** `/delete-account` (static, el + en): says the two flows above and who to write to. It is only added together with LIVE.

Note for the lawyer: the worker notice says other data is deleted when the working relationship ends; this design pseudonymises the roster row instead. One of the two texts must be aligned.
