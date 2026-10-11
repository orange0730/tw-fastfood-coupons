/**
 * Google AdSense 設定。靜態輸出時於建置階段寫入，由 GitHub Actions 從 repo Variables 帶入：
 *   NEXT_PUBLIC_ADSENSE_CLIENT          發布商 ID，例：ca-pub-1234567890123456
 *   NEXT_PUBLIC_ADSENSE_SLOT_TOP        頂部橫幅廣告單元 ID
 *   NEXT_PUBLIC_ADSENSE_SLOT_INFEED     資訊流廣告單元 ID
 *   NEXT_PUBLIC_ADSENSE_INFEED_LAYOUT   資訊流廣告的 data-ad-layout-key（AdSense 後台產生，選填）
 *   NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR    側邊欄廣告單元 ID
 * 未設定 CLIENT 時（本機開發、fork）一律顯示灰底佔位框，不載入 AdSense。
 *
 * 手機吸底廣告不用手動單元：AdSense 政策不允許自行把廣告放進浮動容器，
 * 改在 AdSense 後台開啟「自動廣告 → 錨定廣告」，由 Google 官方元件處理。
 */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';

export const AD_SLOTS = {
  top: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP || '',
  infeed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED || '',
  sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || '',
} as const;

export const INFEED_LAYOUT_KEY = process.env.NEXT_PUBLIC_ADSENSE_INFEED_LAYOUT || '';

export const adsEnabled = /^ca-pub-\d{10,20}$/.test(ADSENSE_CLIENT);
