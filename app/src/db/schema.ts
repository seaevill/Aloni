import Dexie, { type Table } from 'dexie';

// Local schema v2: client-made UUID ids, snake_case, `farm_id` on every row (real farm or demo farm), `legacy_id` = id in the v2 prototype.
export interface Row { id: string; farm_id: string; legacy_id?: string; [k: string]: unknown }
export interface FarmRow { id: string; name: string; is_demo: boolean; meta?: unknown }
export interface SettingRow { key: string; value: unknown }
export interface OutboxRow {
  op_id: string; farm_id: string; table: string; row_id: string; op: 'insert' | 'update'; row: unknown;
  device_id: string; actor_id: string; at: string; status: 'pending' | 'acked' | 'rejected';
  /** Ops written in ONE phone transaction share a group_id (and say how many they are): the server applies them all or none. */
  group_id?: string; group_size?: number;
  /** Why the server refused the op (its own words) and the error code; only on a rejected op. */
  code?: string; reason?: string;
}
export interface WeatherRow { id: string; farm_id: string; parcel_id: string; days: unknown[] }

/** A photo stored on this phone: the processed JPEG bytes (an ArrayBuffer: iPhone Safari cannot always store a Blob) and their SHA-256. Append-only; the outbox entry carries everything except the bytes. */
export interface MediaRow extends Row { device_id?: string; actor_id?: string; sha256: string; mime: string; data: ArrayBuffer; width: number; height: number; bytes: number; created_at: string }

export const FARM_TABLES = ['parcels', 'crops', 'plantings', 'products', 'label_uses', 'stock_lots', 'stock_movements', 'soil_tests', 'water_tests', 'workers', 'jobs', 'job_plantings', 'job_spray', 'job_harvest', 'observations', 'orders_weekly', 'alerts', 'recommendations', 'worker_cards', 'customers', 'customer_orders', 'crop_targets'] as const;
export type FarmTable = (typeof FARM_TABLES)[number];

export class AppDB extends Dexie {
  farms!: Table<FarmRow, string>;
  parcels!: Table<Row, string>;
  crops!: Table<Row, string>;
  plantings!: Table<Row, string>;
  products!: Table<Row, string>;
  label_uses!: Table<Row, string>;
  stock_lots!: Table<Row, string>;
  stock_movements!: Table<Row, string>;
  soil_tests!: Table<Row, string>;
  water_tests!: Table<Row, string>;
  workers!: Table<Row, string>;
  job_plantings!: Table<Row, string>;
  job_spray!: Table<Row, string>;
  job_harvest!: Table<Row, string>;
  observations!: Table<Row, string>;
  jobs!: Table<Row, string>;
  orders_weekly!: Table<Row, string>;
  alerts!: Table<Row, string>;
  recommendations!: Table<Row, string>;
  worker_cards!: Table<Row, string>;
  customers!: Table<Row, string>;
  customer_orders!: Table<Row, string>;
  crop_targets!: Table<Row, string>;
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
    this.version(4).stores({ label_uses: 'id, farm_id, product_id, crop_id' });
    this.version(5).stores({ stock_lots: 'id, farm_id, product_id, lot_key', stock_movements: 'id, farm_id, lot_key, product_id' });
    this.version(6).stores({ soil_tests: 'id, farm_id, parcel_id', water_tests: 'id, farm_id, parcel_id' });
    this.version(7).stores({ workers: 'id, farm_id', job_plantings: 'id, farm_id, job_id, planting_id', job_spray: 'id, farm_id, job_id, amends_id', job_harvest: 'id, farm_id, planting_id' });
    this.version(8).stores({ observations: 'id, farm_id, parcel_id' });
    this.version(9).stores({ worker_cards: 'id, farm_id, worker_id', customers: 'id, farm_id', customer_orders: 'id, farm_id, customer_id, for_day' });   // the owner-only records of SQL 0037 (used once the server has them)
    this.version(10).stores({ crop_targets: 'id, farm_id, crop_id' });   // the season target of SQL 0041 (owner only; used once the owner confirmed 0041)
  }
}
