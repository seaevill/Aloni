import { useEffect, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import type { FarmTable, Row } from '../db/schema';

export interface Rows { rows: Row[] | null; failed: boolean }

export function useRows(table: FarmTable): Rows {
  const [state, setState] = useState<Rows>({ rows: null, failed: false });
  const farm = activeFarm.value;
  const ver = dataVersion.value;
  useEffect(() => {
    let live = true;
    void db[table].where('farm_id').equals(farm).toArray()
      .then((rows) => live && setState({ rows, failed: false }))
      .catch(() => live && setState({ rows: null, failed: true }));
    return () => { live = false; };
  }, [table, farm, ver]);
  return state;
}
