import { promises as fs } from 'fs';
import path from 'path';
import CouponBrowser from '@/components/CouponBrowser';
import { latestUpdate, readCoupons, todayTaipei } from '@/lib/coupons';
import type { CrawlMeta } from '@/types/coupon';

async function readMeta(): Promise<CrawlMeta | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'meta.json'), 'utf-8')) as CrawlMeta;
  } catch {
    return null;
  }
}

// 建置時讀取 data/*.json 直接寫進 HTML：首屏不必再打 API，也利於 SEO
export default async function HomePage() {
  const [coupons, meta] = await Promise.all([readCoupons(), readMeta()]);
  return <CouponBrowser coupons={coupons} updatedAt={latestUpdate(coupons)} meta={meta} buildDate={todayTaipei()} />;
}
