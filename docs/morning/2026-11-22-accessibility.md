# Owner Demo accessibility snapshot · 2026-11-22

WebKit with Greek locale and a fresh context, with service workers blocked. Each cell reports 375 × 812 followed by 320 × 812. The local axe library was injected for the read-only audit. The checks cover the opening viewport of the named screens. axe findings cover the rendered document and list serious/critical violations only. Text contrast sampled visible text against resolvable opaque backgrounds; text on gradients or composited backgrounds remains unmeasured. Target size counted visible buttons, links, inputs, selects and summaries below 56 px in height.

| Screen | Serious or critical axe findings | Horizontal overflow | Measured text samples | Samples below 7:1 | Unmeasured samples | Targets below 56 px |
|---|---:|---:|---:|---:|---:|---:|
| crops | 0 / 0 | 0 / 0 px | 18 / 17 | 0 / 0 | 5 / 5 | 0 / 0 |
| crop-detail | 0 / 0 | 0 / 0 px | 10 / 10 | 0 / 0 | 6 / 6 | 0 / 0 |
| parcels | 0 / 0 | 0 / 0 px | 14 / 12 | 0 / 0 | 5 / 5 | 0 / 0 |
| parcel-detail | 0 / 0 | 0 / 0 px | 18 / 18 | 0 / 0 | 5 / 5 | 0 / 0 |
| stock | 0 / 0 | 0 / 0 px | 21 / 16 | 0 / 0 | 5 / 5 | 0 / 0 |
| register | 0 / 0 | 0 / 0 px | 16 / 13 | 0 / 0 | 5 / 5 | 0 / 0 |
| more | 0 / 0 | 0 / 0 px | 12 / 12 | 0 / 0 | 5 / 5 | 0 / 0 |
| orders | 0 / 0 | 0 / 0 px | 16 / 15 | 0 / 0 | 6 / 6 | 0 / 0 |
| spray | 0 / 0 | 0 / 0 px | 21 / 19 | 0 / 0 | 5 / 5 | 0 / 0 |

Manual VoiceOver traversal, tab order across every nested dialog, off-screen targets and text over composited backgrounds remain to be verified. A clean axe result does not close these checks. The existing tab bar and translucent control contrast require the design-system owner's review if unresolved on device.
