import Dexie, { type Table } from 'dexie';

// Local schema v2: client-made UUID ids, snake_case, `farm_id` on every row (real farm or demo farm), `legacy_id` = id in the v2 prototype.
export interface Row { id: string; farm_id: string; legacy_id?: string; [k: string]: unknown }
export interface FarmRow { id: string; name: string; is_demo: boolean; meta?: unknown }
export interface SettingRow { key: string; value: unknown }
export interface WeatherRow { id: string; farm_id: string; parcel_id: string; days: unknown[] }

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

  constructor(name = 'aloni') {
    super(name);
    const rows = 'id, farm_id, legacy_id';
    this.version(1).stores({
      farms: 'id',
      parcels: rows, crops: rows, plantings: rows, products: rows, jobs: rows, orders_weekly: rows, alerts: rows, recommendations: rows,
      weather: 'id, farm_id',
      settings: 'key', // owner settings (data controller details)
    });
  }
}
