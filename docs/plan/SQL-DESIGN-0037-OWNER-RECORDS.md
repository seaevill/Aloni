# 0037 – owner-only records: worker card, customers, customer orders (design, NOT built – 2026-11-21 night)

Bora's requests 2 and 3. One migration, three owner-only synced tables, one phone change. Needs a red test first with real `authenticated` owner and worker roles, an independent review (Codex), and Bora applying it. Not written tonight on purpose: it replaces the core sync functions, and that must be done from a complete reading of their LATEST definitions.

## Tables (all: `id uuid pk`, `farm_id`, `created_at/by`, `updated_at`, `deleted_at`, `device_id`, `actor_id`, `server_seq`, same triggers as `workers` in 0007: `set_server_seq`, `write_audit`, RLS `has_role(farm_id, array['owner'])` for ALL commands – a worker has NO policy)
- `worker_cards(worker_id → workers, surname, phone)` – first name stays `workers.name`; **no date of birth (Bora's decision)**. One live card per worker (partial unique index). Owner only: a worker must not read another worker's phone, so these columns do NOT go on `workers` (workers can read the roster).
- `customers(name not null, phone, note)` – owner only. Personal data: privacy text must say who sees it (owner only), what it is for (orders), and that it is deleted on request.
- `customer_orders(customer_id → customers, crop_id → crops, crates_str, for_day date, note, status 'open'|'sent'|'cancelled')` – exact whole-crate string like `job_harvest.crates_str`; a change is an UPDATE of the row (orders are not a legal record), cancellation = `status`, removal = `deleted_at`.
Unknown stays unknown: no default customer, no default crates.

## Sync plumbing (the part that must be read in full first)
The fixed table list lives in FOUR functions: `sync_table()` (0012), `pull()` (0016), `bump_sync_generation()` (**0016, redefined in 0017 and again in 0019 – the 0019 body is the current one**), and `sync_visibility()` (unchanged: owner = constant). Each gets `create or replace` with the three names added; nothing else in them changes. Also: the `sync_xid` stamping used by `pull()` (find where each synced table gets the column and trigger), `apply_one` (generic columns; check it needs nothing for a new table), the `phone-columns.json` contract and `contract.sh`.
**Tests first:** owner inserts/reads/updates all three; a worker (real role) gets 0 rows from `select` AND from `pull()` and is refused on insert; another farm's owner sees nothing; a restored-dump `bump_sync_generation()` still re-stamps every table incl. the new ones; the existing suites stay green.

## Phone side (after 0037 is applied) – API for Codex's screens
- Dexie stores `customers`, `customer_orders`, `worker_cards` (generic rows, same `repo.put` path, owner only; never in the worker's pull).
- **Reading orders (for «Αύριο φεύγουν» and the order–harvest view):** `customer_orders` rows with `status = 'open'`, `deleted_at` empty, `for_day = <day>`; sum `crates_str` per `crop_id` (whole numbers; an unreadable string is listed apart and never added). Codex's weekly view reads the same rows: `for_day` within the 4-week window, grouped by crop and day. Nothing else should be read from `orders_weekly` once the one-time import is done.
- **One-time import of the Κλούβες data:** `reference/klouves/` format → one `customers` row per client name, one `customer_orders` row per (client × crop × day); crop names map through the shared crop slugs (`TECH-SPEC §7`); a name that does not map is listed for the owner to fix, never guessed. Runs once, on the owner's tap, and shows the count it imported.
- UI (Claude, after 0037): customer card (name, phone, note), «Νέα παραγγελία» (customer × crop × crates × day), worker card opened by tapping a worker's name in «Εργάτες».

## Privacy text to add (el/tr/en; lawyer to confirm)
Owner notice: customer name, phone and note, and worker surname and phone, are kept only for the owner's own use (orders, contact), are visible only to the owner, never to workers, and are deleted when asked. No date of birth is collected.
