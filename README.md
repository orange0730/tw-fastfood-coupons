# 速食優惠情報站 Taiwan Fast Food Coupons

彙整台灣速食品牌官網公開優惠，一鍵複製優惠碼、直接前往官方點餐頁。

**網站：https://wudodo.me/tw-fastfood-coupons/**

| 品牌 | 資料來源 | 一鍵點餐 |
|---|---|---|
| 肯德基 | 官網優惠券 API | 開啟餐點頁並自動帶入優惠碼 |
| 必勝客 | 官網優惠清單 | 開啟該商品訂購頁 |
| 達美樂 | 官網首頁優惠連結 | 開啟訂購頁並自動帶入優惠碼 |
| 頂呱呱 / 摩斯 / 漢堡王 | 官網活動頁 | 開啟官方點餐入口 |

麥當勞、Subway 的優惠僅在 App 內提供，沒有公開來源，因此未收錄。

## 運作方式

- `scripts/crawler.ts` 每日台灣時間 04:00 由 GitHub Actions 執行，結果寫入 `data/coupons.json` 並 commit。
- 接著以 Next.js 靜態輸出（`output: 'export'`）建置，部署到 GitHub Pages。
- 篩選、搜尋、排序都在瀏覽器端進行（`lib/query.ts`）。
- 任一來源失敗時保留該品牌上次的資料；官方下架的優惠會在下次爬取時移除。

## 開發

```bash
npm install
npm run crawl   # 抓取最新優惠（或 npm run seed 產生離線示範資料）
npm run dev     # http://localhost:3000
```

## 聲明

本站為非官方優惠彙整，與各品牌無合作關係，品牌名稱與商標屬各權利人所有。優惠內容、價格與期限以各品牌官網及門市公告為準。
