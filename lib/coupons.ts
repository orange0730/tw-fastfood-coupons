import { promises as fs } from 'fs';
import path from 'path';
import type { Coupon } from '@/types/coupon';

export * from './query';

const DATA_FILE = path.join(process.cwd(), 'data', 'coupons.json');

export async function readCoupons(): Promise<Coupon[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf-8')) as Coupon[];
  } catch {
    return [];
  }
}
