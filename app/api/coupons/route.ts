import { NextRequest, NextResponse } from 'next/server';
import { latestUpdate, queryCoupons, readCoupons } from '@/lib/coupons';
import type { CouponsResponse, SortKey } from '@/types/coupon';

const SORTS: SortKey[] = ['expiring_soon', 'newest', 'discount'];

// 資料由爬蟲定時更新；CDN 快取 5 分鐘，過期後背景更新
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sort = sp.get('sort') as SortKey | null;
  const all = await readCoupons();

  const base = {
    tag: sp.get('tag') ?? undefined,
    q: sp.get('q') ?? undefined,
    sort: sort && SORTS.includes(sort) ? sort : 'expiring_soon',
    // ?expired=1 → 保留過期項目（回傳 expired: true 標記）；預設隱藏
    includeExpired: sp.get('expired') === '1',
  } as const;

  // 品牌數量以「除了品牌以外的條件」計算，讓品牌列顯示切換後會看到幾筆
  const withoutBrand = queryCoupons(all, base);
  const brandCounts: Record<string, number> = {};
  for (const c of withoutBrand) brandCounts[c.brand] = (brandCounts[c.brand] ?? 0) + 1;

  const brand = sp.get('brand');
  const items = brand && brand !== 'all' ? withoutBrand.filter((c) => c.brand === brand) : withoutBrand;

  const body: CouponsResponse = { total: items.length, updatedAt: latestUpdate(all), brandCounts, items };
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  });
}
