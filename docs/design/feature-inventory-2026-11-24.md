# Feature inventory — before the Field Atelier visual work (2026-11-24)

Generated from `app/src/ui/**/*.tsx` at `origin/main` (data-testid values and `onClick` handlers). It is the checklist for «zero feature loss»: after the visual change every id below must still exist and be reachable; the e2e suite already asserts most of them.

**Navigation:** 5 tabs (Σήμερα, Φυτά, Χωράφια, Αποθήκη, Άλλα); worker app (own account / Demo); Άλλα sub-views: Μητρώο ψεκασμών, Παραγγελίες, Πελάτες, Εργάτες, Εβδομαδιαία αναφορά, Φωτογραφίες, Πληροφορίες, worker view (Demo).

**Sheets (hash `#/<own|demo>/<tab>/sheet/<kind>/<id>`):** account, crate, crates, crop, crops, cut, done, install, invite, job, jobs, notices, parcels, product, refused, spray, spraycalc, store, tomorrow, wait, weather, whatsnew, worker

| File | onClick handlers | test ids |
|---|---|---|
| AccountSheet.tsx | 2 | account-backup, account-backup-done, account-demo, account-owner, account-server, account-typed, account-why, account-wipe, account-worker, sheet-account |
| Analyses.tsx | 5 | analysis, analysis-add-soil, analysis-add-water, analysis-ec-source, analysis-empty, analysis-ph-source |
| AnalysisExplain.tsx | 0 | analysis-crop-range, analysis-crop-ranges, analysis-explain, analysis-leafy-effect, analysis-reading, analysis-recorded-range |
| AnalysisForm.tsx | 4 | analysis-save |
| App.tsx | 1 | – |
| BackBar.tsx | 1 | – |
| Backup.tsx | 2 | backup-msg, backup-note, backup-sensitive, backup-stale |
| Bell.tsx | 1 | bell, bell-count, notice, sheet-notices, sheet-why |
| CrateLabelSheet.tsx | 1 | crate-code, crate-crates, crate-crop, crate-day, crate-label, crate-lot, crate-parcel, crate-print, crate-qr, crate-qr-none, crate-sheet, sheet-notfound |
| CreateFarm.tsx | 1 | create-farm, create-farm-error, create-farm-go, create-farm-name, farm-created |
| CropDetail.tsx | 2 | crop-detail, crop-guide-open, crop-planting-source, crop-sketch, crop-tips-open, crop-weather, crop-weather-day, detail-lastspray, detail-nospray, detail-planting |
| CropGuide.tsx | 0 | crop-guide, guide-banner, guide-none, guide-range |
| CropPace.tsx | 3 | crop-own, crop-pace, crop-pace-wrap, own-gap, own-none, own-unusable, own-yield, pace-clear, pace-crates, pace-edit, pace-end, pace-ends, pace-error, pace-form, pace-left, pace-rate, pace-recent, pace-save, pace-source, pace-unknown |
| CropTips.tsx | 0 | crop-tips, crop-tips-fact, crop-tips-failed, crop-tips-note |
| Crops.tsx | 5 | crop-open, crop-plantings, planting, planting-add, planting-demo-note, planting-edit, planting-wait, season-calendar-open |
| Customers.tsx | 5 | customer, customer-add, customer-imported, customer-name, customer-name-error, customer-new, customer-note, customer-order, customer-orders-none, customer-page, customer-phone, customer-phone-line, customer-save, customers, customers-none, order-crates, order-day, order-error, order-save, order-saved |
| DemoRibbon.tsx | 0 | demo-banner |
| EditTrail.tsx | 0 | edit-entry, edit-trail |
| ErrorReport.tsx | 2 | error-clear, error-copied, error-copy, error-count, error-report, error-text |
| FertPlanCard.tsx | 4 | fert-add, fert-bag, fert-calc, fert-date, fert-day, fert-error, fert-form, fert-item, fert-kg, fert-none, fert-note, fert-photo, fert-photo-add, fert-photo-err, fert-plan, fert-reminders, fert-remove, fert-save, fert-text |
| FieldWorkCard.tsx | 5 | fieldwork, work-add-fertilise, work-add-irrigate, work-cancel, work-day, work-error, work-form, work-item, work-local, work-m3, work-minutes, work-nform, work-nkg, work-none, work-note, work-remove, work-save, work-wx |
| GoLive.tsx | 2 | golive, golive-backup-now, golive-busy, golive-failed, golive-on, golive-start |
| HarvestBreakdown.tsx | 0 | harvest-breakdown, harvest-breakdown-count, harvest-crop-event, harvest-crop-history, harvest-destination, harvest-destination-group, harvest-destination-total |
| HarvestForm.tsx | 10 | harvest, harvest-blocked, harvest-chip, harvest-chosen, harvest-count, harvest-crates, harvest-crates-error, harvest-cutby, harvest-cutby-error, harvest-cutby-option, harvest-dest, harvest-dest-dispatch, harvest-dest-error, harvest-dest-store, harvest-less, harvest-more, harvest-noroster, harvest-planting-error, harvest-recv-name, harvest-recv-phone, harvest-save, harvest-saved-line, harvest-who |
| HarvestHistory.tsx | 1 | harvest, harvest-breakdown-open, harvest-who |
| History.tsx | 0 | history, history-edited |
| Info.tsx | 2 | account-open, info-contacts, info-disclaimer, info-photos, info-privacy, invite-status |
| InstallSheet.tsx | 0 | install-warning, sheet-install |
| InviteSheet.tsx | 3 | invite-copied, invite-copy, invite-for, invite-lang, invite-link, invite-note, invite-qr, invite-qr-none, invite-share, sheet-invite |
| JobDetailSheet.tsx | 0 | job-harvest, job-harvests-none, job-late-days, job-plantings-none, job-spray, job-spray-none, sheet-job, sheet-notfound |
| JobForm.tsx | 7 | job-dose, job-dose-same, job-error, job-flags, job-label, job-label-dose, job-needs, job-nolabel, job-save |
| JobsSheet.tsx | 1 | job-row, sheet-jobs, sheet-jobs-done, sheet-why |
| KaekCard.tsx | 3 | kaek-card, kaek-edit, kaek-error, kaek-form, kaek-input, kaek-local, kaek-none, kaek-remove, kaek-save, kaek-value |
| LabelUseForm.tsx | 6 | labeluse-reason, labeluse-save, labeluse-signed-note |
| LabelUses.tsx | 4 | labeluse, labeluse-add, labeluse-empty, labeluse-status, labeluse-why, signoff-open, signoff-shown-note |
| LeaveBar.tsx | 2 | leave-ask, leave-go, leave-stay |
| More.tsx | 12 | demo-load, dev-section, more-menu, open-customers, open-info, open-orders, open-photos, open-register, open-weekly-report, open-worker-view, open-workers, opened-from, this-phone |
| Notifications.tsx | 1 | notifications, notify-nokey, notify-rules, notify-saved, notify-toggle, quiet-from, quiet-to |
| ObservationForm.tsx | 5 | observation-form, observe-error, observe-photo, observe-save |
| Onboarding.tsx | 2 | onboarding, onboarding-next, onboarding-skip |
| Orders.tsx | 5 | dispatch, dispatch-client, dispatch-client-total, dispatch-copied, dispatch-copy, dispatch-date, dispatch-days, dispatch-held, dispatch-item, dispatch-next, dispatch-none, dispatch-prev, dispatch-reimport, dispatch-text, dispatch-today, dispatch-tomorrow, fourweeks, fourweeks-cell, fourweeks-head, fourweeks-row, orders, orders-bad, orders-empty, orders-file, orders-map, orders-none, orders-skipped, orders-unmapped |
| ParcelCut.tsx | 4 | cut-day, cut-form, cut-last, cut-local, cut-none, cut-open, cut-save, cut-sprout, cut-undo, parcel-cut |
| ParcelDetail.tsx | 5 | analysis-open, detail-cut, detail-planting, detail-spray, detail-weather, parcel-detail, parcel-edit, parcel-weather-source, planting-sketch-label, sketch-note, sketch-unknown, timeline, timeline-event |
| ParcelForm.tsx | 6 | edit-reason, edit-reason-error, parcel-boundary-set, parcel-map-open, parcel-osde, parcel-save, parcel-walk-open, pin |
| ParcelMap.tsx | 4 | map-area, map-area-line, map-cancel, map-canvas, map-clear, map-diff, map-nowebgl, map-save, map-where, parcel-map |
| ParcelSketch.tsx | 0 | parcel-nosketch, parcel-sketch, sketch-mark |
| ParcelWalk.tsx | 3 | parcel-walk, parcel-walk-area, parcel-walk-point, parcel-walk-reading, parcel-walk-rejected, parcel-walk-use |
| Parcels.tsx | 4 | parcel-add, parcel-demo-note, parcel-open, parcel-sketch-open, parcel-sketch-overview, parcel-sketch-status, parcel-wait |
| Photos.tsx | 3 | photo, photo-add, photo-count, photo-msg, photo-viewer, photos-demo-note |
| PlantingForm.tsx | 5 | edit-reason, edit-reason-error, planting-save, planting-warn |
| PlantingSketchDraw.tsx | 3 | planting-sketch-area, planting-sketch-draw |
| ProductForm.tsx | 5 | product-photo, product-save |
| ProductSheet.tsx | 1 | product-calc, product-general, product-knowledge, product-link, product-purpose, product-source, product-stock, sheet-notfound |
| QuickAdd.tsx | 5 | quick-harvest, quick-job, quick-menu, quick-observe, quick-open, quick-spray |
| Readiness.tsx | 3 | ready-advisor-confirm, ready-farm-input, ready-farm-set, ready-migration-confirm, ready-summary |
| RecurringJobs.tsx | 4 | rec-add, rec-error, rec-form, rec-local, rec-next, rec-none, rec-remove, rec-rule, rec-save, rec-title, rec-today, rec-today-item, recurring |
| RefusedSheet.tsx | 0 | refused-fix, refused-op, refused-raw, refused-why, sheet-refused, sheet-why |
| Register.tsx | 6 | register, register-csv, register-csv-machine, register-csv-warnings, register-draft, register-empty, register-fillin, register-holder, register-json, register-line, register-print, register-record-end, register-record-product, register-vat |
| RegisterPrint.tsx | 0 | register-print-dose, register-print-page |
| Rejected.tsx | 1 | rejected-fix, rejected-raw, rejected-why, sync-rejected, sync-rejected-line |
| SeasonCalendar.tsx | 0 | season-calendar, season-month |
| SeedCard.tsx | 3 | seed-card, seed-edit, seed-error, seed-form, seed-input, seed-kg, seed-note, seed-rate, seed-remove, seed-row, seed-save, seed-total |
| SettingsBox.tsx | 1 | settings-saved, soon-days |
| ShareCard.tsx | 2 | share-card, share-close, share-handle, share-preview, share-privacy, share-send |
| SignIn.tsx | 4 | farm-id, sign-in, signed-in, signin-error, signin-resend, signin-send, signin-sent, signin-verify |
| SignOff.tsx | 3 | signoff-form, signoff-note, signoff-photo, signoff-save |
| SowRing.tsx | 0 | crop-tips-ring, crop-tips-ring-block, crop-tips-ring-note |
| SprayCalcSheet.tsx | 2 | scalc-area, scalc-blocked, scalc-crop, scalc-nolabel, scalc-note, scalc-planting, scalc-product, scalc-result, scalc-tank, scalc-tanks, scalc-water, scalc-water-total, sheet-notfound, spray-calc |
| SprayCorrection.tsx | 4 | corr-dose, corr-earlier, corr-qty, corr-reason, corr-reason-error, corr-save, corr-time, spray-correction |
| SprayForm.tsx | 9 | spray-bbch, spray-dose, spray-dose-error, spray-dose-reason, spray-dose-same, spray-error, spray-flags, spray-label, spray-label-dose, spray-late-error, spray-late-reason, spray-mix-note, spray-mixed-error, spray-needs, spray-noreg, spray-onecrop, spray-over-error, spray-over-reason, spray-prescription, spray-qty, spray-qty-unknown, spray-save, spray-save-mix, spray-start, spray-start-error, spray-total-hint, spray-unit-error |
| SpraySheet.tsx | 1 | sheet-notfound, spray-sheet, spray-sheet-cutfrom, spray-sheet-dose, spray-sheet-over, spray-sheet-product, spray-sheet-reentry |
| Sprays.tsx | 6 | spray, spray-correct-open, spray-detail-open, spray-empty, spray-manual, spray-mix, spray-phi, spray-phi-unknown, spray-product-open, spray-rei, spray-trail, spray-why, wait-entry, wait-open, wait-phi, wait-reason, wait-reason-error, wait-rei, wait-save |
| Stock.tsx | 8 | labeluse-open, product, product-add, product-demo-note, product-expiry, product-info, product-noreg, product-phi, product-source-open, product-stock, stock-active, stock-filter-all, stock-filters, stock-group, stock-open |
| StockForms.tsx | 7 | adjust-save, receive-save |
| StockLots.tsx | 3 | adjust-open, lot, lot-balance, lot-days-left, lot-detail, lot-detail-movement, lot-detail-open, lot-flag, movement, receive-open, stock-empty, stock-total |
| StoreStock.tsx | 1 | sheet-notfound, store-age, store-none, store-row, store-sheet, store-split-dispatch, store-split-store, store-split-unknown, store-stock, store-tomorrow |
| TargetBlock.tsx | 3 | target-block, target-clear, target-crates, target-edit, target-form, target-local, target-over, target-save, target-since, target-unreadable, target-why |
| Toast.tsx | 1 | toast, toast-live |
| Today.tsx | 18 | brand, cut, cut-empty, cut-free-group, cut-headline, cut-late, cut-line, cut-source, cut-today, harvest-open, harvest-saved, history-open, install-open, job-done-today, job-late, job-open, job-planned, job-saved, jobs-done, jobs-none, kpi-crops, kpi-parcels, num-cut, observe-saved, share-open, spray-open, spray-saved, tasks-counts, today-canharvest, today-counts, today-cut28, today-cut7, today-cut7-big, today-date, today-farm, today-held, today-kpis, today-numbers, today-who, today-who-none, today-who-overdue, tomorrow, tomorrow-chip, tomorrow-noimport, tomorrow-none, tomorrow-open, tomorrow-ordered, tomorrow-row, tomorrow-supply, tomorrow-unmapped, urgent, urgent-action, weather-strip, welcome, wx-day, wx-none, wx-now-temp, wx-rain, wx-source, wx-stale, wx-temp |
| TodayDone.tsx | 3 | crate-open, done-sheet, sheet-notfound, today-done-row |
| TodaySheets.tsx | 3 | sheet-crates, sheet-crop, sheet-crops, sheet-cut, sheet-group, sheet-notfound, sheet-parcels, sheet-unreadable, sheet-why |
| TomorrowNotes.tsx | 1 | note, note-add, note-by-worker, note-error, note-text, notes |
| TomorrowSheet.tsx | 2 | tomorrow-copy, tomorrow-customer, tomorrow-gap, tomorrow-loaded, tomorrow-sheet, tomorrow-store |
| UpdateBar.tsx | 1 | db-blocked, offline-ready, update-apply, update-bar |
| WaitSheet.tsx | 1 | sheet-notfound, sheet-wait, sheet-why |
| WaterCard.tsx | 4 | water-card, water-crop, water-flow, water-flow-edit, water-flow-save, water-gap, water-hours, water-kc, water-kc-edit, water-kc-save, water-need, water-note, water-rain, water-vgap, water-vneed |
| WeatherSheet.tsx | 0 | sheet-weather, sheet-why, weather-hour, weather-hourly-demo |
| WhatsNewSheet.tsx | 0 | release, sheet-whatsnew |
| WorkerApp.tsx | 16 | hi-review, job-back, job-confirm, job-done, job-skip, observe-photo, observe-photo-input, observe-save, observe-thumb, worker-app, worker-board, worker-data, worker-data-ack, worker-dose, worker-exit, worker-finished, worker-free-job, worker-job, worker-job-date, worker-lang, worker-late-reason, worker-lock, worker-lock-why, worker-nojobs, worker-start, worker-start-error, worker-status, worker-status-harvest, worker-take, worker-tray, worker-waiting |
| WorkerCard.tsx | 1 | sheet-notfound, wcard-phone, wcard-save, wcard-saved, wcard-surname, worker-card |
| Workers.tsx | 6 | invite-closed, invite-open, invite-qr-open, invite-send, invite-withdraw, worker, worker-add, worker-name, worker-open, workers-demo, workers-empty |
| YearCompare.tsx | 0 | year-chart, year-compare, year-last-same, year-last-total, year-nolast, year-this, year-unreadable |
| cx/HarvestHeat.tsx | 1 | harvest-heat |
| cx/MonthRing.tsx | 0 | month-ring |
| cx/RecordSearch.tsx | 0 | record-search |
| cx/SourcePage.tsx | 0 | source-page |
| cx/TapNum.tsx | 1 | tap-number |
| cx/TipsCard.tsx | 0 | tips-card |
| cx/UnknownWhy.tsx | 0 | unknown-why |
| cx/WeeklyReport.tsx | 1 | weekly-range, weekly-report |
| ds/CheckDraw.tsx | 0 | check-draw |
| ds/DataViz.tsx | 0 | ds-weather, week, week-delta, week-eligible, week-orders, week-unknown, weekbars-empty |
| ds/DetailSheet.tsx | 2 | sheet-close, sheet-handle, sheet-scrim |
| ds/Gallery.tsx | 3 | ds-gallery, gallery-brand, gallery-card, gallery-chips, gallery-crops, gallery-empty, gallery-fill, gallery-motion, gallery-sheet, gallery-tags, gallery-viz, motion-commit, motion-fade, motion-roll, motion-sheet, sheet-open |
| ds/ProgressRing.tsx | 0 | target-ring |
| ds/SheetHost.tsx | 0 | sheet-notfound |
| ds/Surfaces.tsx | 2 | ds-hero, ds-topbar |
| ds/WaitRing.tsx | 0 | wait-ring |
| states.tsx | 4 | empty-second, empty-state, error-state, mark-phone, mark-rejected, mark-sent, sync-chip |

Totals: 109 files with actions, 830 test ids, 300 click handlers.
