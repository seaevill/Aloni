// THE single setting that says which weather source the scheduled job uses. Beta: MET Norway (free, commercial use allowed, no key). Open-Meteo (paid plan, needs a key) comes later and is
// re-assessed before the pilot (DECISIONS 2026-11-19). Changing the source = changing this one line; the rules engine reads the same fields from either (types.ts).
export type SourceId = 'metno' | 'openmeteo';
export const WEATHER_SOURCE: SourceId = 'metno';
/** The version in the User-Agent «Aloni/<version> https://github.com/seaevill/Aloni» (a test keeps it equal to app/package.json). */
export const UA_VERSION = '0.0.0';
/** After this many hours a forecast is shown as «παλιά δεδομένα» in the app (app/src/weather/strip.ts keeps the same number, a test compares them). */
export const STALE_AFTER_HOURS = 12;
