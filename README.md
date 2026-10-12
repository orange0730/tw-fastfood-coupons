# 速食優惠情報站 Taiwan Fast Food Coupons

彙整台灣速食品牌官網公開優惠，一鍵複製優惠碼、直接前往官方點餐頁或開啟品牌 App。

**網站：https://wudodo.me/tw-fastfood-coupons/**

| 品牌 | 資料來源（皆為官網） | 一鍵點餐 | 官方 App |
|---|---|---|---|
| 麥當勞 | 「最新活動」各活動頁 | — （優惠券僅在 App） | 麥當勞APP |
| 肯德基 | 優惠券 API | 開啟餐點頁並自動帶入優惠碼 | PK雙饗卡 |
| 必勝客 | 「優惠推薦」清單 | 開啟該商品訂購頁 | 必勝客訂餐 |
| 達美樂 | 首頁優惠連結 | 開啟訂購頁並自動帶入優惠碼 | 達美樂 App |
| 漢堡王 | 官網訂餐「優惠券」分類 + 門市優惠券 | 開啟該商品訂購頁 | — |
| 摩斯 | 首頁活動 | 官方網路訂餐 | MOS Order（iPhone） |
| 頂呱呱 | 「活動快訊」 | 官方點餐系統 | — |

Subway 台灣官網沒有公開優惠資訊，暫不收錄。

### 一鍵開 App

各品牌點餐網站都沒有設定 Universal Links / App Links，網頁無法直接跳進 App 內的指定頁面。
因此「App」按鈕會先複製優惠代碼，再依裝置開啟該 App 的 App Store / Google Play 頁面（已安裝會顯示「打開」）；
電腦上則展開兩個商店連結。App 的商店 ID 都以 App Store 搜尋 API 與 Google Play 頁面核對過開發商。

## 運作方式

- `scripts/crawler.ts` 每日台灣時間約 03:17 由 GitHub Actions 執行（GitHub 排程可能延遲），結果寫入 `data/coupons.json`。
- 每次執行也會更新 `data/meta.json`（檢查時間、各來源狀態），網站顯示「最後檢查」時間與「資料來源」狀態；超過 36 小時未更新會顯示提醒。
- 接著以 Next.js 靜態輸出（`output: 'export'`）建置，部署到 GitHub Pages。篩選、搜尋、排序都在瀏覽器端進行（`lib/query.ts`）。
- 任一來源失敗時保留該品牌上次的資料；官方下架的優惠會在下次爬取時移除。

## 開發

```bash
npm install
npm run crawl   # 抓取最新優惠（或 npm run seed 產生離線示範資料）
npm run dev     # http://localhost:3000
```

## 聲明

本站為非官方優惠彙整，與各品牌無合作關係，品牌名稱與商標屬各權利人所有。優惠內容、價格與期限以各品牌官網及門市公告為準。
