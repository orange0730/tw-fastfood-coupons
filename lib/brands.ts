import type { BrandId } from '@/types/coupon';

export interface BrandApp {
  /** 顯示名稱，例：麥當勞APP */
  name: string;
  /** App Store 頁面（iOS） */
  ios?: string;
  /** Google Play 頁面（Android） */
  android?: string;
}

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
  /**
   * 官方 App。2026-10 以 App Store 搜尋 API 與 Google Play 頁面核對開發商為品牌本身或台灣代理商。
   * 各品牌點餐網站皆未設定 Universal Links / App Links（.well-known 檔案為 404/403/空），
   * 無法從網頁直接跳進 App 內指定頁面，因此導向商店頁：已安裝會顯示「打開」，未安裝可直接下載。
   */
  app?: BrandApp;
}

const appStore = (id: number) => `https://apps.apple.com/tw/app/id${id}`;
const googlePlay = (pkg: string) => `https://play.google.com/store/apps/details?id=${pkg}&hl=zh_TW`;

export const BRANDS: BrandInfo[] = [
  {
    id: 'mcdonalds',
    name: '麥當勞',
    mark: 'M',
    color: '#DA291C',
    ink: '#FFC72C',
    app: { name: '麥當勞APP', ios: appStore(1217507712), android: googlePlay('com.mcdonalds.mobileapp') },
  },
  {
    id: 'kfc',
    name: '肯德基',
    mark: 'KFC',
    color: '#C8102E',
    ink: '#fff',
    orderUrl: 'https://www.kfcclub.com.tw/coupon',
    // 台灣肯德基官方 App 為與必勝客共用的 PK雙饗卡（富利餐飲）；App Store 上的「肯德基KFC（官方版）」是中國版
    app: { name: 'PK雙饗卡 App', ios: appStore(1277406216), android: googlePlay('tw.com.pkcard') },
  },
  {
    id: 'pizzahut',
    name: '必勝客',
    mark: 'PH',
    color: '#B5121B',
    ink: '#fff',
    orderUrl: 'https://www.pizzahut.com.tw/promotions/',
    app: { name: '必勝客訂餐 App', ios: appStore(1597717171), android: googlePlay('tw.com.pizzahut.webapp') },
  },
  {
    id: 'dominos',
    name: '達美樂',
    mark: 'DPZ',
    color: '#006491',
    ink: '#fff',
    orderUrl: 'https://order.dominos.com.tw/',
    // 達美樂官網首頁直接連結的官方 App
    app: { name: '達美樂 App', ios: appStore(336882722), android: googlePlay('au.com.dominos.olo.android.app') },
  },
  {
    id: 'mos',
    name: '摩斯漢堡',
    mark: 'MOS',
    color: '#C8102E',
    ink: '#fff',
    orderUrl: 'https://weborder.mos.com.tw/',
    // MOS Order 在 App Store 標示僅支援 iPhone；Google Play 查無可確認的套件名稱，改導向搜尋結果
    app: {
      name: 'MOS Order',
      ios: appStore(509435066),
      android: 'https://play.google.com/store/search?q=MOS%20Order%20%E6%91%A9%E6%96%AF&c=apps&hl=zh_TW',
    },
  },
  { id: 'burgerking', name: '漢堡王', mark: 'BK', color: '#D62300', ink: '#F5EBDC', orderUrl: 'https://www.burgerking.com.tw/category/6' },
  { id: 'tkk', name: '頂呱呱', mark: 'TKK', color: '#E4002B', ink: '#fff', orderUrl: 'https://www.tkkinc.com.tw/tkkorder/' },
  { id: 'subway', name: 'Subway', mark: 'S', color: '#008C15', ink: '#FFC600' },
  { id: 'other', name: '其他', mark: '+', color: '#57534E', ink: '#fff' },
];

export const BRAND_MAP = Object.fromEntries(BRANDS.map((b) => [b.id, b])) as Record<BrandId, BrandInfo>;

export const QUICK_TAGS = ['買一送一', '百元有找', '早餐', '外送', '外帶', 'APP 專屬', '套餐'] as const;
