import type { BrandId } from '@/types/coupon';

export interface BrandInfo {
  id: BrandId;
  name: string;
  /** 品牌標記上的縮寫（純文字，不使用官方 Logo） */
  mark: string;
  /** 品牌主色，用於標記底色與色點 */
  color: string;
  /** 標記文字色 */
  ink: string;
  /** 官方線上點餐入口（無單品深度連結時的備援） */
  orderUrl?: string;
}

export const BRANDS: BrandInfo[] = [
  { id: 'kfc', name: '肯德基', mark: 'KFC', color: '#C8102E', ink: '#fff', orderUrl: 'https://www.kfcclub.com.tw/coupon' },
  { id: 'pizzahut', name: '必勝客', mark: 'PH', color: '#B5121B', ink: '#fff', orderUrl: 'https://www.pizzahut.com.tw/promotions/' },
  { id: 'dominos', name: '達美樂', mark: 'DPZ', color: '#006491', ink: '#fff', orderUrl: 'https://order.dominos.com.tw/' },
  { id: 'mcdonalds', name: '麥當勞', mark: 'M', color: '#DA291C', ink: '#FFC72C' },
  { id: 'mos', name: '摩斯漢堡', mark: 'MOS', color: '#C8102E', ink: '#fff', orderUrl: 'https://weborder.mos.com.tw/' },
  { id: 'burgerking', name: '漢堡王', mark: 'BK', color: '#D62300', ink: '#F5EBDC', orderUrl: 'https://www.burgerking.com.tw/' },
  { id: 'tkk', name: '頂呱呱', mark: 'TKK', color: '#E4002B', ink: '#fff', orderUrl: 'https://www.tkkinc.com.tw/tkkorder/' },
  { id: 'subway', name: 'Subway', mark: 'S', color: '#008C15', ink: '#FFC600' },
  { id: 'other', name: '其他', mark: '+', color: '#57534E', ink: '#fff' },
];

export const BRAND_MAP = Object.fromEntries(BRANDS.map((b) => [b.id, b])) as Record<BrandId, BrandInfo>;

export const QUICK_TAGS = ['買一送一', '百元有找', '早餐', '外送', '外帶', 'APP 專屬', '套餐'] as const;
