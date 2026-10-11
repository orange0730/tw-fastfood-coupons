import CouponBrowser from '@/components/CouponBrowser';
import { latestUpdate, readCoupons, todayTaipei } from '@/lib/coupons';

// 建置時讀取 data/coupons.json 直接寫進 HTML：首屏不必再打 API，也利於 SEO
export default async function HomePage() {
  const coupons = await readCoupons();
  return <CouponBrowser coupons={coupons} updatedAt={latestUpdate(coupons)} buildDate={todayTaipei()} />;
}
