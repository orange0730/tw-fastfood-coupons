/**
 * 產生示範優惠資料 → data/coupons.json（離線開發用）
 * 日期以「今天」為基準的相對天數，確保一啟動就有未過期資料。
 * 內容為示範用，非各品牌真實現行活動；會標記 demo: true，
 * 前端顯示「示範資料」標籤，執行 `npm run crawl` 成功後會自動移除。
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { BrandId, Coupon } from '../types/coupon';

const fmt = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(d);
const offset = (days: number) => fmt(new Date(Date.now() + days * 86_400_000));

type Row = Pick<Coupon, 'title' | 'code' | 'originalPrice' | 'discountPrice' | 'tags' | 'conditions'> & {
  start: number;
  end: number;
  upd: number;
};
type Seed = Row & { brand: BrandId; sourceUrl: string };

const S = (brand: BrandId, sourceUrl: string, rows: Row[]): Seed[] => rows.map((r) => ({ ...r, brand, sourceUrl }));

const seeds: Seed[] = [
  ...S('mcdonalds', 'https://www.mcdonalds.com/tw/zh-tw.html', [
    { title: '大麥克套餐 優惠價', code: 'MCD-BIG99', originalPrice: 169, discountPrice: 129, tags: ['套餐', '百元有找'], start: -10, end: 3, upd: -2, conditions: '限內用/外帶，不得與其他優惠併用。' },
    { title: '早餐 滿福堡+飲料', code: 'MCD-AM59', originalPrice: 85, discountPrice: 59, tags: ['早餐'], start: -20, end: 20, upd: -5, conditions: '供應時間 04:00–10:30。' },
    { title: '麥脆雞 買一送一', code: 'MCD-BOGO', originalPrice: 99, discountPrice: 50, tags: ['買一送一'], start: -3, end: 12, upd: -1, conditions: '限 App 兌換，每人每日限用一次。' },
    { title: '麥當勞外送 免運券', code: 'MCD-FREE', tags: ['外送'], start: -5, end: 30, upd: -4, conditions: '限指定外送平台，滿 $250 適用。' },
    { title: '【已過期示範】開心樂園餐 優惠', code: 'MCD-OLD', originalPrice: 99, discountPrice: 79, tags: ['套餐'], start: -40, end: -3, upd: -30 },
  ]),
  ...S('kfc', 'https://www.kfc.com.tw/', [
    { title: '歡聚桶 限定價', code: 'KFC-FAM499', originalPrice: 699, discountPrice: 499, tags: ['套餐', '外送'], start: -7, end: 5, upd: -3, conditions: '全台門市適用，限量供應。' },
    { title: '咔啦雞腿堡 買一送一', code: 'KFC-BOGO', originalPrice: 79, discountPrice: 40, tags: ['買一送一'], start: -2, end: 9, upd: -1, conditions: '限週二會員日，需出示 App 條碼。' },
    { title: '早餐蛋堡+紅茶', originalPrice: 75, discountPrice: 55, tags: ['早餐', '百元有找'], start: -30, end: 45, upd: -10 },
    { title: '外送專屬 酥脆雞 6 塊', code: 'KFC-DLV6', originalPrice: 240, discountPrice: 179, tags: ['外送'], start: -1, end: 14, upd: 0, conditions: '限官方 App 外送。' },
  ]),
  ...S('mos', 'https://www.mos.com.tw/', [
    { title: '摩斯漢堡+薯條+飲料 超值套餐', code: 'MOS-SET119', originalPrice: 155, discountPrice: 119, tags: ['套餐', '百元有找'], start: -12, end: 6, upd: -2 },
    { title: '早餐 熱壓吐司組', originalPrice: 90, discountPrice: 69, tags: ['早餐'], start: -25, end: 40, upd: -8, conditions: '供應至 11:00。' },
    { title: '米漢堡 買一送一', code: 'MOS-RICE2', originalPrice: 75, discountPrice: 38, tags: ['買一送一'], start: -4, end: 18, upd: -1, conditions: '限 MOS APP 會員。' },
  ]),
  ...S('burgerking', 'https://www.burgerking.com.tw/', [
    { title: '華堡 買一送一', code: 'BK-WHOP1', originalPrice: 119, discountPrice: 60, tags: ['買一送一'], start: -6, end: 4, upd: -2, conditions: '限內用及外帶，外送不適用。' },
    { title: '百元有找 雙牛堡餐', code: 'BK-100', originalPrice: 159, discountPrice: 99, tags: ['百元有找', '套餐'], start: -9, end: 25, upd: -3 },
    { title: '早餐 蛋堡套餐', originalPrice: 85, discountPrice: 65, tags: ['早餐'], start: -14, end: 35, upd: -6, conditions: '供應至 10:30。' },
  ]),
  ...S('subway', 'https://www.subway.com/zh-TW', [
    { title: '15cm 潛艇堡+飲料 套餐價', code: 'SUB-15', originalPrice: 140, discountPrice: 99, tags: ['百元有找', '套餐'], start: -8, end: 11, upd: -2 },
    { title: '30cm 潛艇堡 買一送一', code: 'SUB-BOGO', originalPrice: 220, discountPrice: 110, tags: ['買一送一'], start: -2, end: 2, upd: -1, conditions: '限指定口味，需出示 App。' },
    { title: '早餐 烤蛋三明治', originalPrice: 70, discountPrice: 49, tags: ['早餐'], start: -18, end: 28, upd: -7 },
  ]),
  ...S('pizzahut', 'https://www.pizzahut.com.tw/', [
    { title: '大披薩 買一送一', code: 'PH-BOGO', originalPrice: 580, discountPrice: 290, tags: ['買一送一', '外送'], start: -5, end: 8, upd: -1, conditions: '限外帶自取，需於官網預訂。' },
    { title: '雙人超值餐', code: 'PH-DUO', originalPrice: 699, discountPrice: 499, tags: ['套餐', '外送'], start: -11, end: 16, upd: -4 },
  ]),
  ...S('dominos', 'https://www.dominos.com.tw/', [
    { title: '外帶披薩 第二件半價', code: 'DOM-HALF', originalPrice: 420, discountPrice: 315, tags: ['外送'], start: -6, end: 13, upd: -2, conditions: '限外帶自取。' },
    { title: '百元有找 個人披薩套餐', code: 'DOM-99', originalPrice: 150, discountPrice: 99, tags: ['百元有找'], start: -3, end: 7, upd: -1 },
  ]),
  ...S('tkk', 'https://www.tkkfriedchicken.com/', [
    { title: '炸雞桶 外送優惠', code: 'TKK-BKT', originalPrice: 480, discountPrice: 359, tags: ['外送', '套餐'], start: -4, end: 21, upd: -2 },
    { title: '雞塊+薯條 買一送一', originalPrice: 90, discountPrice: 45, tags: ['買一送一', '百元有找'], start: -8, end: 1, upd: -3, conditions: '限當日使用。' },
  ]),
];

async function main() {
  const coupons: Coupon[] = seeds.map((s, i) => ({
    id: `${s.brand}-${String(i + 1).padStart(3, '0')}`,
    brand: s.brand,
    title: s.title,
    code: s.code,
    originalPrice: s.originalPrice,
    discountPrice: s.discountPrice,
    tags: s.tags,
    startDate: offset(s.start),
    endDate: offset(s.end),
    conditions: s.conditions,
    sourceUrl: s.sourceUrl,
    updatedAt: new Date(Date.now() + s.upd * 86_400_000).toISOString(),
    demo: true,
  }));

  const file = path.join(process.cwd(), 'data', 'coupons.json');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(coupons, null, 2) + '\n', 'utf-8');
  console.log(`seeded ${coupons.length} coupons -> ${path.relative(process.cwd(), file)}`);
}

main();
