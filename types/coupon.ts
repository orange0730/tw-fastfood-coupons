export type BrandId =
  | 'mcdonalds'
  | 'kfc'
  | 'mos'
  | 'burgerking'
  | 'subway'
  | 'pizzahut'
  | 'dominos'
  | 'tkk'
  | 'other';

export interface Coupon {
  id: string;
  brand: BrandId;
  title: string;
  description?: string;
  code?: string; // 優惠代碼，供一鍵複製
  originalPrice?: number;
  discountPrice?: number;
  /** 「$299 起」這類起價 */
  priceFrom?: boolean;
  tags: string[]; // 如：'買一送一', '早餐', '外送', '百元有找'
  startDate?: string;
  endDate: string; // 格式 YYYY-MM-DD
  /** 官方未公布截止日，endDate 為爬蟲推估（每次爬取會延長，下架即消失） */
  endDateEstimated?: boolean;
  imageUrl?: string;
  conditions?: string; // 使用限制
  /** 一鍵點餐：直接開啟官方點餐頁（已帶入優惠碼 / 商品） */
  orderUrl?: string;
  /** orderUrl 已自動帶入優惠碼，使用者不必手動輸入 */
  codeAutoApplied?: boolean;
  sourceUrl: string;
  updatedAt: string;
  /** 由 scripts/seed.ts 產生的示範資料 */
  demo?: boolean;
}

export type SortKey = 'expiring_soon' | 'newest' | 'discount';

/** API 回傳時附加的衍生欄位 */
export interface CouponView extends Coupon {
  expired: boolean;
  daysLeft: number;
  discountPercent: number | null;
}

export interface CouponsResponse {
  total: number;
  updatedAt: string | null;
  /** 套用品牌以外篩選條件後，各品牌的筆數 */
  brandCounts: Record<string, number>;
  items: CouponView[];
}
