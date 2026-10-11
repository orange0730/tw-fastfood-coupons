import { NextResponse } from 'next/server';
import { countByBrand, latestUpdate, queryCoupons, readCoupons } from '@/lib/coupons';
import type { CouponsResponse } from '@/types/coupon';

// 網站以靜態輸出部署在 GitHub Pages：建置時產生一份完整 JSON（/api/coupons），
// brand / tag / q / sort 篩選改在瀏覽器端進行（見 lib/query.ts，與此處共用同一套邏輯）
export const dynamic = 'force-static';

export async function GET() {
  const all = await readCoupons();
  const items = queryCoupons(all, { includeExpired: true });
  const body: CouponsResponse = {
    total: items.length,
    updatedAt: latestUpdate(all),
    brandCounts: countByBrand(items.filter((c) => !c.expired)),
    items,
  };
  return NextResponse.json(body);
}
