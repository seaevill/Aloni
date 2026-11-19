import { useEffect, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import type { WeatherRow } from '../db/schema';

/** The stored weather of the active farm (empty until a forecast has been stored: the Open-Meteo function is not switched on). */
export function useWeather(): WeatherRow[] {
  const [rows, setRows] = useState<WeatherRow[]>([]);
  const farm = activeFarm.value; const ver = dataVersion.value;
  useEffect(() => {
    let live = true;
    void db.weather.where('farm_id').equals(farm).toArray().then((r) => live && setRows(r)).catch(() => live && setRows([]));
    return () => { live = false; };
  }, [farm, ver]);
  return rows;
}
