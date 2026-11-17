import Dexie, { type Table } from 'dexie';

/** Every row belongs to exactly one farm (real or demo). `uid` = `${farmId}:${id}` so ids never collide. */
export interface Row { uid: string; farmId: string; id: string; [k: string]: unknown }
export interface FarmRow { id: string; name: string; isDemo: boolean; meta?: unknown }
export interface SettingRow { key: string; value: unknown }
export interface WeatherRow { uid: string; farmId: string; parcelId: string; days: unknown[] }

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

  constructor(name = 'aloni-farm') {
    super(name);
    this.version(1).stores({
      farms: 'id',
      parcels: 'uid, farmId',
      crops: 'uid, farmId',
      plantings: 'uid, farmId',
      products: 'uid, farmId',
      jobs: 'uid, farmId',
      orders_weekly: 'uid, farmId',
      alerts: 'uid, farmId',
      recommendations: 'uid, farmId',
      weather: 'uid, farmId',
    });
    this.version(2).stores({ settings: 'key' }); // owner settings (data controller details); migrated by M1 PR 4a
  }
}
