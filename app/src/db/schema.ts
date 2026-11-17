import Dexie, { type Table } from 'dexie';

// Local schema v2: client-made UUID ids, snake_case, `farm_id` on every row (real farm or demo farm), `legacy_id` = id in the v2 prototype.
export interface Row { id: string; farm_id: string; legacy_id?: string; [k: string]: unknown }
export interface FarmRow { id: string; name: string; is_demo: boolean; meta?: unknown }
export interface SettingRow { key: string; value: unknown }
export interface OutboxRow {
  op_id: string; farm_id: string; table: string; row_id: string; op: 'insert' | 'update'; row: unknown;
  device_id: string; actor_id: string; at: string; status: 'pending' | 'acked';
}
export interface WeatherRow { id: string; farm_id: string; parcel_id: string; days: unknown[] }

/** A photo stored on this phone: the processed JPEG bytes (an ArrayBuffer: iPhone Safari cannot always store a Blob) and their SHA-256. Append-only; the outbox entry carries everything except the bytes. */
export interface MediaRow extends Row { sha256: string; mime: string; data: ArrayBuffer; width: number; height: number; bytes: number; created_at: string }

export const FARM_TABLES = ['parcels', 'crops', 'plantings', 'products', 'jobs', 'orders_weekly', 'alerts', 'recommendations'] as const;
export type FarmTable = (typeof FARM_TABLES)[number];

export class AppDB extends Dexie {
  farms!: Table<FarmRow, string>;
  parcels!: Table<Row, string>;
  crops!: Table<Row, string>;
  plantings!: Table<Row, string>;
  products!: Table<Row, string>;
  jobs!: Table<Row, string>;
  orders_weekly!: Table<Row, string>;
  alerts!: Table<Row, string>;
  recommendations!: Table<Row, string>;
  weather!: Table<WeatherRow, string>;
  settings!: Table<SettingRow, string>;
  media!: Table<MediaRow, string>;
  outbox!: Table<OutboxRow, string>; // what still has to reach the server (never holds demo rows)

  constructor(name = 'aloni') {
    super(name);
    const rows = 'id, farm_id, legacy_id';
    this.version(1).stores({
      farms: 'id',
      parcels: rows, crops: rows, plantings: rows, products: rows, jobs: rows, orders_weekly: rows, alerts: rows, recommendations: rows,
      weather: 'id, farm_id',
      settings: 'key', // owner settings (data controller details)
    });
    this.version(2).stores({ outbox: 'op_id, farm_id, status' });
    this.version(3).stores({ media: 'id, farm_id, sha256' });
  }
}
