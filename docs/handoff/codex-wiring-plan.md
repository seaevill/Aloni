# Codex integration plan

Use the tested component and data branches after their required CI passes and the relevant screen file is free of active work. Resolve existing list-to-detail test ownership before changing user entry points.

## Crop information and tips

- In `app/src/ui/CropDetail.tsx`, add the existing lightbulb icon to a labelled button of at least 56 px.
- Call `cropContent(slug, locale)` from `app/src/content/crops/index.ts`. Open the crop information card only for a found record. Use Greek for unsupported owner locales.
- Pass the record to `TipsCard` and put the general-information banner first. Put history and facts below the first screen.
- Keep product, dose or other treatment advice out of this path. Verify the existing detail opener still receives focus on return.

## Harvest heatmap and month ring

- In `app/src/ui/CropDetail.tsx`, map same-farm harvest records into `heatData` from `packages/rules-core/src/views/recordedHarvest.ts`. Feed historical PHI/REI outcomes as explicit statuses.
- Give `HarvestHeat` twelve Athens week keys and parcel labels. Show excluded and eligible groups separately in the detail opened by the cell.
- Use `monthRingData` with the crop's actual sowing records. Feed the result and localized month labels to `MonthRing`.
- In `app/src/ui/History.tsx`, wire each cell to the parcel/week record source once the date-aware breakdown is available.

## Season summary and order shortfalls

- In `app/src/ui/CropDetail.tsx` and `app/src/ui/ParcelDetail.tsx`, pass the subject and explicit season bounds to `seasonSummary`.
- Use the returned record IDs for drill-down and print views; held, unknown and undated groups stay separate.
- In `app/src/ui/Orders.tsx`, pass existing weekly supply to the pure `sowingGaps` function and link each known shortfall to its source week.
- Show scheduling decisions only when the independent rule has recorded, signed inputs. Missing inputs should explain absence of a decision.

## Worker handling tips

- Claude Code owns `app/src/ui/WorkerApp.tsx`. Add a short line only on an existing crop-specific action.
- Look up the recorded crop slug in `app/src/content/worker-tips/hi.json` or its Greek source.
- Use the worker's selected language and the recorded farm crop. Leave the line absent for an unsupported language or unknown crop.
- Keep these handling notes independent of spray, harvest eligibility and location decisions.

## Future measurements

- In `app/src/ui/Analyses.tsx`, add an information entry only when a matching stored field and its original unit are available.
- In `app/src/ui/AnalysisExplain.tsx`, retrieve `futureAnalysis(field, locale)` and render what it means, how it changes, and the general effect on leafy vegetables.
- Keep the recorded value and unit unchanged. Continue to show the informational signature state. The new copy supplies no thresholds.

## Weather terms

- Claude Code owns the shared weather sheet. In `app/src/ui/WeatherSheet.tsx` or its current weather sheet module, call `weatherExplanation(field, locale)` when the owner opens a glossary item.
- Keep measured or estimated provenance beside the actual weather value. Show the glossary in a separate informational section.
- Keep rule outcomes and weather readings separate. Loading the copy makes no request.

## Integration checks

- Open the test-only gallery at 320 and 375 px and compare the supplied PNGs before wiring.
- Repeat axe and keyboard checks from the actual screen entry points. Run the four-language content coverage tests.
- Inspect the integrated contrast and perform the Greek VoiceOver check on an iPhone.
