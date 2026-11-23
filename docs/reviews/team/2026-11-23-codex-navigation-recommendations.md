# Navigation recommendations · 2026-11-23

These are implementation proposals based on the current source at `5087f7c`. The five flows below were reviewed in code. The mobile comparison for the More screen is separate.

| Flow | Current evidence | Proposed change and acceptance |
|---|---|---|
| Today | `app/src/ui/Today.tsx` renders weather, operational totals, two record actions, the task count and a second quick-add entry. | Put this day's blockers and assigned work before secondary totals. Give logging one predictable entry. At 375 px, the owner can reach the next job and the reason for a held harvest from the first screen. |
| Observation to task | `app/src/ui/WorkerApp.tsx` saves an observation, then clears its inputs. Today opens observation and job entry separately. | Offer a manual follow-up from the saved observation, carrying the parcel and a reference. Open a draft for the owner to confirm. Test that dismissing it creates no job and that retrying does not duplicate the observation. |
| Worker | `app/src/ui/WorkerApp.tsx` has a tab tray and uses different cards for waiting and finished jobs. | Keep the active job's parcel, next action and wait reason together. Show the reason in text beside the icon. Test that the worker can read the reason and return to the job without losing entered fields. |
| Sync and offline | `app/src/ui/states.tsx` renders the sync status as a live region. The rejection and pending-record surfaces are separate. | Use the same states on the banner and the record detail. Distinguish a device-only save, pending sync, confirmed receipt and refusal. Test offline save, reconnect, confirmed receipt and refusal without losing the local record. |
| Parcel history | `app/src/ui/ParcelDetail.tsx` renders recent sprays separately from the timeline, and timeline events are plain cards. | Make the single chronological list the route to source records. Keep each event visually distinct and show a reason if its source is missing. Test that a spray opens its corresponding record and that Athens midnight does not change the event order. |

## Remaining More dependency

PR #485 changes `More.tsx` for the ledger entry. `app/tests/e2e/more-v2.spec.ts` also requires the Demo worker shortcut to stay third in the primary menu. Moving that shortcut into a separate Demo block needs a coordinated component and test change. The current styling keeps DOM, focus and visual order aligned.
