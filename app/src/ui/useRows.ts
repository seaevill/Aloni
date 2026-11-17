import { useEffect, useState } from 'preact/hooks';
import { activeFarm, dataVersion, db } from '../db';
import type { FarmTable, Row } from '../db/schema';

export function useRows(table: FarmTable): Row[] | null {
  const [rows, setRows] = useState<Row[] | null>(null);
  const farm = activeFarm.value;
  const ver = dataVersion.value;
  useEffect(() => {
    let live = true;
    void db[table].where('farmId').equals(farm).toArray().then((r) => live && setRows(r));
    return () => { live = false; };
  }, [table, farm, ver]);
  return rows;
}
