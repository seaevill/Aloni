# Tech lead → M1 review (2026-11-17, origin/m1-plan)

## 1. M1.md issues
1. **Split PR 4.** It won't fit in 400 lines. Make it 4a (schema v2 + import + UUIDv5) and 4b (`repo.put`/outbox/device id + demo test). Move UUIDv5 out of PR 2 so references aren't rewritten twice.
2. **Guard deleting `aloni-farm`.** It can't be undone. Delete only if every row is in the Demo farm; otherwise keep it and offer an export. Test this.
3. **Greek decimals.** In el-GR `1.000` means 1000. Reject anything that can be read two ways («μη έγκυρο»); never guess. Golden tests: `0,025`, `0.025`, `1.000`, `1,000.5`.
4. **Enforce the single write path.** Ban direct Dexie writes outside `repo/` (ESLint) and throw on update/delete of append-only tables (Dexie hook). Name where the audit trail lives (amend rows + outbox, kept ≥3 y).
5. **iOS eviction.** Photos live only on the phone, and Safari can evict storage for sites not added to the Home Screen. Make "Add to Home Screen" step 1 of the checklist, and warn in the app if it isn't standalone or `persist()` is false.

## 2. Satellite map: yes, research it
The table must cover:
- offline caching/prefetch licence
- free tier limits
- commercial use
- imagery date/resolution over Megara
- EU hosting/GDPR
- attribution
- XYZ/WMTS in 3857 vs WMS in EPSG:2100

What I found:
- **MapTiler free plan:** non-commercial, "temporary personal cache" only, no bulk downloads ([terms](https://www.maptiler.com/cloud/terms/)). Offline use means a paid plan or a written agreement.
- **Ktimatologio:** there is an orthophoto viewer ([gov.gr](https://www.gov.gr/en/org/ktimanet/ktematographese/thease-orthophotographion)). The open WMS `gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx` is cited only by an [old 2011 source](https://michaeltopo.blogspot.com/2011/10/wms-servers-and-autocad-map-greek.html). I could not confirm it is live or its terms: none are published, and the host is blocked from here.
- **ΟΣΔΕ LPIS:** no public WMS found. Check INSPIRE and the [GreekOpenData plugin](https://plugins.qgis.org/plugins/GreekOpenData/).
- Ask Ktimatologio in writing.

## 3. False "unpushed commits" warning
The single-branch shallow clone maps only `main`, so `origin/<branch>` never exists. Fix:
- Run once: `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`
- Always use `git push -u origin HEAD`.
- For existing branches: `git fetch --depth=20 origin <b>:refs/remotes/origin/<b>`

## 4. Workers' phones
- **Own phones:** one `device_id` per worker and a long login session. A PIN is optional. Each phone's outbox holds only that worker's data, so a lost phone affects one person. The cost is setting up each phone.
- **Shared phone:** one `device_id`. A per-worker PIN switches the user. Every row and op needs `actor_id` as well as `device_id`. Unsynced data from several workers sits on one device, which needs auto-lock and must never sync under the wrong user.
- **Either way:** keep `actor_id` separate from `device_id` from M2 on, so switching later is cheap.

**Default:** a shared farm phone with PINs. Bora controls it; own phones can come later.
