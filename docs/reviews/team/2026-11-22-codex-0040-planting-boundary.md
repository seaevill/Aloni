# 0040 planting outlines · independent SQL review

Reviewed #430 at `83ff997bc57813ce9863ed4295bc74d683fe0d42`. PostgreSQL 17.11 with PostGIS, Supabase layout and the repository role fixtures. The submitted outline and worker denial checks passed.

## MUST

1. **Preserve containment when the parent parcel changes.** `supabase/migrations/0040_planting_boundary.sql:32–39` validates only planting writes. Under the authenticated owner fixture I saved an inside planting then shrank its parcel with an edit reason. Both writes succeeded and the persisted pair returned false from `ST_CoveredBy`. Enforce or explicitly invalidate dependent outlines on parent edits, serialize the parent and child checks against concurrent edits, and add rollback-safe tests for both paths. Preserve the typed area when resolving geometry.

## SHOULD

- Test the normal owner sync path for a boundary edit and computed square metres. `supabase/tests/m20_planting_boundary.sql:14–34` currently exercises direct authenticated statements.

## LOW

- Clarify whether two-dimensional coordinates alone are accepted; GeoJSON geometry validity does not by itself reject a third coordinate.

MUST var – hazır değil
