// What EVERY weather source hands to the rest of the system (°C, %, km/h, mm; the rules engine reads these fields whatever the source). A value the source did not give is null, never 0.
export interface HourRow { at: string; temp_c: number | null; dewpoint_c: number | null; rh_pct: number | null; wind_kmh: number | null; gust_kmh: number | null; rain_mm: number | null; cloud_pct: number | null }
export interface DayRow { day: string; tmin: number | null; tmax: number | null; rain_mm: number | null; sunrise: string | null; sunset: string | null }
export interface Forecast { model: string; issued_at: string; cell_elev_m: number | null; hours: HourRow[]; days: DayRow[] }
