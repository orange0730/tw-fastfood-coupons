import { promises as fs } from 'fs';
import path from 'path';
import type { Coupon, CouponView, SortKey } from '@/types/coupon';

const DATA_FILE = path.join(process.cwd(), 'data', 'coupons.json');

export async function readCoupons(): Promise<Coupon[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf-8')) as Coupon[];
  } catch {
    return [];
  }
}

/** 以台北時區的「今天」計算，避免 UTC 伺服器日期差一天 */
export function todayTaipei(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export interface CouponQuery {
  brand?: string;
  tag?: string;
  q?: string;
  sort?: SortKey;
  includeExpired?: boolean;
}

export function toView(c: Coupon, today = todayTaipei()): CouponView {
  const daysLeft = daysBetween(today, c.endDate);
  const discountPercent =
    c.originalPrice && c.discountPrice && c.discountPrice < c.originalPrice
      ? Math.round((1 - c.discountPrice / c.originalPrice) * 100)
      : null;
  return { ...c, daysLeft, expired: daysLeft < 0, discountPercent };
}

export function queryCoupons(all: Coupon[], opts: CouponQuery): CouponView[] {
  const today = todayTaipei();
  const kw = opts.q?.trim().toLowerCase();

  let list = all.map((c) => toView(c, today));

  if (!opts.includeExpired) list = list.filter((c) => !c.expired);
  if (opts.brand && opts.brand !== 'all') list = list.filter((c) => c.brand === opts.brand);
  if (opts.tag) list = list.filter((c) => c.tags.includes(opts.tag!));
  if (kw) {
    list = list.filter((c) =>
      [c.title, c.description ?? '', c.code ?? '', c.conditions ?? '', ...c.tags].some((s) =>
        s.toLowerCase().includes(kw),
      ),
    );
  }

  // 推估截止日的項目排在有明確截止日的之後，避免「即將到期」被假日期洗版
  const urgency = (c: CouponView) => (c.endDateEstimated ? 1 : 0);
  list.sort((a, b) => {
    if (a.expired !== b.expired) return Number(a.expired) - Number(b.expired);
    switch (opts.sort) {
      case 'newest':
        return b.updatedAt.localeCompare(a.updatedAt);
      case 'discount':
        return (b.discountPercent ?? -1) - (a.discountPercent ?? -1);
      default:
        return urgency(a) - urgency(b) || a.endDate.localeCompare(b.endDate);
    }
  });
  return list;
}

export function latestUpdate(all: Coupon[]): string | null {
  return all.reduce<string | null>((m, c) => (!m || c.updatedAt > m ? c.updatedAt : m), null);
}
