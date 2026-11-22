# Live acceptance · 2026-11-22

Tested the live Cloudflare site at https://aloni.ormanbora.workers.dev. The footer displayed build `d17f739`, which resolves to Git commit `d17f7395f54b6bd3ff1fb0c342eeeab5c32cc4b0`. The Cloudflare deployment ID was unavailable from the page.

Playwright WebKit, 375 × 812, Greek, Europe/Athens, fresh browser context with service workers blocked. Opened the Demo farm from Άλλα and exercised its screens. Kept personal data and production records outside the run. FAIL includes cases where a required part could not be demonstrated with the available fixture.

| Request | Result | Live evidence |
|---|---|---|
| [R1](R1.png) | FAIL | The selected Today row did not open the requested crop breakdown in the captured run. |
| [R2](R2.png) | FAIL | The waiting indicator displayed days and percentage. The unknown-state reason without a ring was not verified. |
| [R3](R3.png) | FAIL | The next-day note action was visible. A worker-authored note with the requested tag was not demonstrated. |
| [R4](R4.png) | FAIL | The sheet showed daily weather and its source. Hourly weather was unavailable, and the parcel widget did not open the requested sheet. |
| [R5](R5.png) | PASS | The parcel tile opened five named parcels. The crop tile opened [named crops](R5-crops.png). |
| [R6](R6.png) | FAIL | The 7-day sheet showed missing-data reasons. Neither it nor the [28-day capture](R6-28.png) demonstrated the full requested breakdown. |
| [R7](R7.png) | PASS | The tile identified parcels in the waiting-status breakdown. |
| [R8](R8.png) | FAIL | The Demo fixture had no jobs in the captured Today list, so neither dispatch nor spray detail could be verified there. |
| [R9](R9.png) | FAIL | An overdue job opened with parcel and crop. Its related spray or harvest record was unavailable. |
| [R10](R10.png) | PASS | The history spray opened its product sheet with general information. See R11 and R16 for separate acceptance criteria. |
| [R11](R11.png) | PASS | The spray showed the recorded dose, timing, waiting indicator, re-entry end and product link. |
| [R12](R12.png) | FAIL | The harvest gave the parcel and a legacy destination reason. Same-crop history and destination subtotals were missing. |
| [R13](R13.png) | FAIL | The list exposed crop rows, but the capture did not verify five complete rows with illustrations and one chip in the first viewport. |
| [R14](R14.png) | FAIL | Tips and facts opened. The requested lightbulb and recorded sowing-month ring were missing. |
| [R15](R15.png) | FAIL | The crop detail displayed an indicative sketch. The capture did not demonstrate the selected planting's highlighted area. |
| [R16](R16.png) | FAIL | The sheet showed recorded restrictions, sign-off and stock, with a reason for an unavailable official link. It did not show a recorded purpose or an active-specific explanation. |
| [R17](R17.png) | FAIL | The [combined sketch](R17-overview.png) was available. Parcel weather did not open its sheet, and the planting opened a general crop sheet. |
| [R18](R18.png) | FAIL | The pH card showed the recorded value and two unsigned literature references for spinach. The requested EC and OM crop references were not demonstrated. |
| [R19](R19.png) | FAIL | The product name opened a sheet, but cards lacked the requested dedicated info control and the explanation was shared by product class. |
| [R20](R20.png) | FAIL | Crate totals, ages and tomorrow's dispatch appeared. The requested per-crop pictures were not demonstrated in the capture. |
| [R21](R21.png) | FAIL | The two destination tiles and optional receiver fields appeared. Persistence and the owner-only receiver view were unverified. |
| [R22](R22.png) | FAIL | The customer form opened. An order flowing through to both aggregates was unverified. |
| [R23](R23.png) | PASS | The owner card for Γιώργος exposed the requested name, surname and phone fields without a birth-date field. This capture does not verify access control in other roles. |
| [R24](R24.png) | FAIL | The tiles used short labels and icons. Crop illustrations and press feedback were not demonstrated. |
| [R25](R25.png) | FAIL | The fixture did not show a job claim or an owner seeing the winning worker. |
| [R26](R26.png) | FAIL | Demo weather was labelled. The real-farm activation path was outside the exercised Demo session. |
| [R27](R27.png) | FAIL | The spray form opened with an empty dose. Unchanged behavior across deployments was not verified. |
| [R28](R28.png) | FAIL | The weekly report opened with a print action and missing-data reasons. Unchanged behavior across deployments was not verified. |
| [R29](R29.png) | FAIL | The worker bell was empty. The fixture did not demonstrate new-job or acceptance notifications. |
| [R30](R30.png) | FAIL | OM appeared as a recorded analysis field. A tappable crop-specific OM reference was unavailable. |

## Integration requests

- CC-REQ: Today and weather owners to check R1–R2, R4, R6 and R8, including empty Demo fixtures and parcel weather handoff.
- CC-REQ: Tasks owner to check R3, R9 and R25 with a worker-authored note, linked record and claimable job.
- CC-REQ: Worker, customer and notifications owners to verify R21–R22, R24, R26 and R29 with local Demo fixtures and role-specific checks.
