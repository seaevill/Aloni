import { APP_NAME } from '../config';
import { FARM_TABLES, type AppDB } from './schema';

/**
 * The server's farm id IS the phone's farm id. A phone with NO records of its own for its real farm (a worker's fresh phone) takes the server's id; a phone that already
 * holds records keeps its id (the owner creates the server farm with THAT id, RUNBOOK 12). Returns what happened; nothing is ever merged or relabelled.
 */
export async function adoptFarm(db: AppDB, farmId: string): Promise<'same' | 'adopted' | 'refused'> {
  const real = await db.farms.filter((f) => !f.is_demo).first();
  if (real?.id === farmId) return 'same';
  if (real) {
    for (const name of FARM_TABLES) if ((await db.table(name).where('farm_id').equals(real.id).count()) > 0) return 'refused';
    if ((await db.outbox.where('farm_id').equals(real.id).count()) > 0) return 'refused';
  }
  await db.transaction('rw', [db.farms], async () => {
    if (real) await db.farms.delete(real.id);
    await db.farms.put({ id: farmId, name: APP_NAME, is_demo: false });
  });
  return 'adopted';
}
