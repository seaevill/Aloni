# Art. 30 data inventory (RoPA) – Aloni, draft for the lawyer

Status 2026-11-19: **draft**. Every legal basis below is a proposal "for the lawyer"; nothing here is legal advice. Controller: the farm owner (Bora). No tracking, EU hosting only (Supabase Frankfurt, planned; the app is local-only until LIVE).

| Data subject | Field (where) | Why | Proposed basis (lawyer to confirm) | Kept |
|---|---|---|---|---|
| Worker | name (`workers.name`) | who did the job | contract / legal duty (plant-protection records) | roster while employed; spray/harvest rows ≥ 3 years |
| Worker | e-mail (auth user, only if the worker has an account) | sign-in by one-time code | contract | until the account is revoked |
| Worker | phone (`workers.phone`, optional) | reach the worker | consent | until removed |
| Worker | `actor_id`, `cut_by`, `applicator_id` on spray/harvest/observation rows | who did what (inspection record) | legal duty | ≥ 3 years, append-only |
| Worker | `device_id` (random id per phone, in the outbox) | sync de-duplication | legitimate interest / contract | while the outbox exists |
| Worker / owner | timestamps of each action | records must show when | legal duty | with the row |
| Owner / worker | photos (`media`) | field evidence | contract | until deleted; GPS/EXIF is stripped on import (re-encoded, tested in `photo-exif.spec.ts`) |
| Owner | business name, address, phone, VAT id (`settings`) | inspection register header | legal duty | until changed |
| – | one-time-code e-mail provider | sign-in mail | **TBD: EU provider with a DPA** (open decision) | – |

Not collected: location tracking, advertising ids, analytics, contacts. Recipients: hosting provider (processor, EU) once LIVE. Transfers outside the EU: none planned (weather data is fetched server-side with field coordinates only; MET Norway is in the EEA).
