/**
 * 爬蟲：抓取各品牌公開優惠 → 合併進 data/coupons.json
 *
 * 來源（2026-10 驗證可用）：
 *   - 肯德基   olo-api.kfcclub.com.tw/menu/v1/QueryCoupons（官網優惠券頁使用的公開 API）
 *   - 必勝客   www.pizzahut.com.tw/promotions/（伺服器端渲染的優惠清單）
 *   - 達美樂   www.dominos.com.tw 首頁帶 ?vc= 優惠代碼的訂購連結
 *   - 頂呱呱   www.tkkfriedchicken.com/event.html 活動快訊
 *   - 摩斯     www.mos.com.tw 首頁活動 Banner → 各活動頁
 *   - 漢堡王   www.burgerking.com.tw/coupon 門市優惠券（圖片）
 *   麥當勞 / Subway 的優惠僅在 App 內提供，沒有公開來源。
 *
 * 合併規則：
 *   1. 來源成功 → 該品牌的爬蟲資料以本次結果「整批取代」（官方下架即消失）。
 *   2. 來源失敗 → 保留該品牌上次的資料（優雅 Fallback），不影響其他品牌。
 *   3. 只要有任一來源成功，就移除 seed 產生的示範資料。
 *   4. 內容沒變就不寫檔 → GitHub Actions 不會產生多餘 commit。
 *
 * 請遵守各站 robots.txt 與使用條款，並維持低頻率（每日一次）。
 */
import { promises as fs } from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import type { BrandId, Coupon } from '../types/coupon';

const DATA_FILE = path.join(process.cwd(), 'data', 'coupons.json');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
/** 官方未公布截止日時，推估的有效天數；每日重新爬取會往後延，下架即從清單移除 */
const ESTIMATED_DAYS = 7;

type Draft = Omit<Coupon, 'id' | 'brand' | 'updatedAt' | 'endDate' | 'startDate'> & {
  key: string;
  endDate?: string;
  startDate?: string;
};

interface Source {
  brand: BrandId;
  crawl: () => Promise<Draft[]>;
}

// ---------- helpers ----------

const fmtDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(d);
const today = () => fmtDate(new Date());
const plusDays = (n: number) => fmtDate(new Date(Date.now() + n * 86_400_000));

async function get(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, 'Accept-Language': 'zh-TW,zh;q=0.9', ...init.headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res;
}
const getHtml = async (url: string) => cheerio.load(await (await get(url)).text());

const clean = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const num = (s: string | undefined) => {
  const n = Number((s ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function guessTags(text: string): string[] {
  const t = new Set<string>();
  if (/買.{0,6}送|買一送一|買1送1|BOGO/i.test(text)) t.add('買一送一');
  if (/早餐|早安|晨/.test(text)) t.add('早餐');
  if (/外送/.test(text)) t.add('外送');
  if (/外帶/.test(text)) t.add('外帶');
  if (/APP/i.test(text)) t.add('APP 專屬');
  if (/套餐|分享餐|雙人|全家|派對|桶/.test(text)) t.add('套餐');
  return [...t];
}

/** 解析標題中的活動期間，例：「6/1-12/31青年大滿足」「10-12月合作優惠」 */
function parseRange(text: string): { raw: string; start: string; end: string } | null {
  const year = Number(today().slice(0, 4));
  const pad = (n: number) => String(n).padStart(2, '0');
  const md = text.match(/(\d{1,2})\/(\d{1,2})\s*[-~～至]\s*(\d{1,2})\/(\d{1,2})/);
  if (md) {
    const [m1, d1, m2, d2] = md.slice(1).map(Number);
    const endYear = m2 < m1 ? year + 1 : year;
    return { raw: md[0], start: `${year}-${pad(m1)}-${pad(d1)}`, end: `${endYear}-${pad(m2)}-${pad(d2)}` };
  }
  const months = text.match(/(\d{1,2})\s*[-~～至]\s*(\d{1,2})\s*月/);
  if (months) {
    const m1 = Number(months[1]);
    const m2 = Number(months[2]);
    if (m1 >= 1 && m2 <= 12) {
      const endYear = m2 < m1 ? year + 1 : year;
      const last = new Date(Date.UTC(endYear, m2, 0)).getUTCDate();
      return { raw: months[0], start: `${year}-${pad(m1)}-01`, end: `${endYear}-${pad(m2)}-${pad(last)}` };
    }
  }
  return null;
}

function withPriceTag(tags: string[], price?: number) {
  return price != null && price <= 100 && !tags.includes('百元有找') ? [...tags, '百元有找'] : tags;
}

// ---------- sources ----------

const kfc: Source = {
  brand: 'kfc',
  async crawl() {
    const res = await get('https://olo-api.kfcclub.com.tw/menu/v1/QueryCoupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://www.kfcclub.com.tw',
        Referer: 'https://www.kfcclub.com.tw/coupon',
      },
      body: JSON.stringify({ mealPeriod: '', orderType: '', orderDate: today().replaceAll('-', '/') }),
    });
    const json = (await res.json()) as {
      Success: boolean;
      Data?: {
        Category: string;
        CouponCode: string;
        Fcode: string;
        ImgNameNew?: string;
        NewName: string;
        Price: string;
        Intro?: string;
        Hyperlink?: string;
      }[];
    };
    if (!json.Success || !json.Data?.length) throw new Error('empty response');

    // 官方資料偶有「咔」字變成「?」的編碼問題
    const fix = (s: string | undefined) => clean(s).replace(/\?啦/g, '咔啦');

    return json.Data.map((d) => {
      const intro = fix(d.Intro);
      const price = num(d.Price);
      const original = num(intro.match(/原價\s*\$?\s*(\d+)/)?.[1]);
      const items = intro.replace(/\s*\(原價\$?\d+\)/, '').replace(/\s*\$\d+\s*$/, '').trim();
      const name = fix(d.NewName).replace(new RegExp(`^${d.CouponCode}\\s*-\\s*`), '');
      // 多數券名稱只有「優惠券」，改用餐點內容當標題
      const generic = !name || name === '優惠券';
      return {
        key: d.CouponCode,
        title: generic ? items.replaceAll('+', ' + ') : name,
        description: generic ? undefined : items.replaceAll('+', ' + ') || undefined,
        code: d.CouponCode,
        discountPrice: price,
        originalPrice: original && price && original > price ? original : undefined,
        tags: withPriceTag(guessTags(`${d.Category} ${name} ${intro}`), price),
        imageUrl: d.ImgNameNew ? `https://kfcoosfs.kfcclub.com.tw/${encodeURIComponent(d.ImgNameNew)}` : undefined,
        conditions: `${d.Category}。供應時段與適用門市依官網結帳頁為準。`,
        // 與官網優惠券頁點擊行為一致：/meal/{Fcode}?couponProduct={code}
        orderUrl: d.Hyperlink || `https://www.kfcclub.com.tw/meal/${d.Fcode}?couponProduct=${d.CouponCode}`,
        codeAutoApplied: !d.Hyperlink,
        sourceUrl: 'https://www.kfcclub.com.tw/coupon',
      };
    });
  },
};

const PH_SECTIONS: Record<string, string> = { '11': 'APP 專屬', '1685': '外帶' };

const pizzahut: Source = {
  brand: 'pizzahut',
  async crawl() {
    const base = 'https://www.pizzahut.com.tw/promotions/';
    const $ = await getHtml(base);
    const out: Draft[] = [];
    $('.promotion_list_item').each((_, el) => {
      const $el = $(el);
      const href = $el.find('a').attr('href') ?? '';
      const params = new URLSearchParams(href.split('?')[1] ?? '');
      const pid = params.get('p_id');
      const title = clean($el.find('.pro-li-name').text());
      if (!pid || !title || /購物袋/.test(title)) return;

      const desc = clean($el.find('.pro-list-descContent').text());
      const priceText = clean($el.find('.pro-list-bottomWrap').text());
      const price = num(priceText.match(/\$\s?([\d,]+)/)?.[1]);
      const all = `${title} ${desc}`;
      if (!price && !/送|折|半價|\+\$1|優惠|特價/.test(all)) return;

      const tags = guessTags(all);
      const section = PH_SECTIONS[params.get('cu') ?? ''];
      if (section && !tags.includes(section)) tags.push(section);

      out.push({
        key: pid,
        title: title.replace(/^APP專屬-/, ''),
        description: desc && desc !== title ? desc : undefined,
        discountPrice: price,
        priceFrom: /起/.test(priceText) || undefined,
        tags: withPriceTag(tags, price),
        imageUrl: $el.find('img').attr('data-src') || undefined,
        orderUrl: `https://www.pizzahut.com.tw/order/?mode=step_2&cu=${params.get('cu') ?? ''}&p_id=${pid}`,
        sourceUrl: base,
      });
    });
    return out;
  },
};

const dominos: Source = {
  brand: 'dominos',
  async crawl() {
    const base = 'https://www.dominos.com.tw/';
    const $ = await getHtml(base);
    const byCode = new Map<string, Draft>();
    $('a[href*="vc="]').each((_, a) => {
      const href = $(a).attr('href')!;
      const code = new URL(href, base).searchParams.get('vc');
      if (!code || byCode.has(code)) return;
      // 往上找最近的 Banner 圖片：圖檔名稱就是活動名稱（例：買大送大banner-500x500.jpg）
      let box = $(a).parent();
      for (let i = 0; i < 4 && !box.find('img').length; i++) box = box.parent();
      const img = box.find('img').first();
      const src = img.attr('src');
      const fromFile = src ? decodeURIComponent(src.split('/').pop()!).replace(/banner.*$/i, '').trim() : '';
      const title = fromFile || clean(img.attr('alt')) || '線上訂購優惠';
      const pickup = /pickup/.test(href);
      byCode.set(code, {
        key: code,
        title: pickup ? `${title}（外帶）` : title,
        description: clean(img.attr('alt')) || undefined,
        code,
        tags: [...new Set([...guessTags(`${title} ${img.attr('alt') ?? ''}`), ...(pickup ? ['外帶'] : [])])],
        imageUrl: src ? new URL(src, base).toString() : undefined,
        conditions: '選擇外送地址或外帶門市後即可套用。',
        orderUrl: new URL(href, base).toString(),
        codeAutoApplied: true,
        sourceUrl: base,
      });
    });
    return [...byCode.values()];
  },
};

const tkk: Source = {
  brand: 'tkk',
  async crawl() {
    const base = 'https://www.tkkfriedchicken.com/event.html';
    const $ = await getHtml(base);
    const out: Draft[] = [];
    $('.announcement--content').each((_, el) => {
      const $el = $(el);
      const href = $el.find('a.announcement--pic').attr('href') ?? '';
      const m = decodeURIComponent(href).match(/^eventContent_(\d+)_(.+)\.html$/);
      if (!m) return;
      const [, id, fullTitle] = m;
      // 只收錄與優惠有關的活動，略過周邊商品、門市公告等
      if (!/優惠|折|送|\$|元|限定|套餐|加購/.test(fullTitle) || /周邊/.test(fullTitle)) return;
      const date = clean($el.find('.date').text()).replaceAll('.', '-');
      const price = num(fullTitle.match(/(\d{2,4})\s*元/)?.[1]);
      const range = parseRange(fullTitle);
      out.push({
        key: id,
        title: fullTitle,
        description: clean($el.find('.announcement--caption p').text()).replace(/\.\.\.$/, '…') || undefined,
        discountPrice: price,
        tags: withPriceTag(guessTags(fullTitle), price),
        startDate: range?.start ?? (/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined),
        endDate: range?.end,
        imageUrl: new URL($el.find('img').attr('src') ?? '', base).toString(),
        orderUrl: 'https://www.tkkinc.com.tw/tkkorder/',
        sourceUrl: new URL(href, base).toString(),
      });
    });
    return out;
  },
};

const mos: Source = {
  brand: 'mos',
  async crawl() {
    const base = 'https://www.mos.com.tw/';
    const $ = await getHtml(base);
    const links = new Map<string, string | undefined>();
    $('a[href*="news.aspx?id="]').each((_, a) => {
      const href = new URL($(a).attr('href')!.trim(), base).toString();
      const img = $(a).find('img').attr('src');
      if (!links.has(href) || (!links.get(href) && img)) links.set(href, img ? new URL(img, base).toString() : undefined);
    });

    const out: Draft[] = [];
    for (const [href, banner] of [...links].slice(0, 12)) {
      try {
        const $p = await getHtml(href);
        $p('script, style, noscript').remove();
        // 活動頁標題只出現在麵包屑：「首頁 › 202610 › 魔力萬聖節」
        const crumb = clean($p('body').text()).replace(/^首頁\s*/, '');
        const title = crumb
          .replace(/^\d{6}\s*/, '')
          .replace(/[-_]?\d{6}$/, '')
          .slice(0, 60);
        // 略過點餐方式、名單、抽獎等非優惠公告
        if (!title || /點餐|KIOSK|循環杯|名單|抽獎/i.test(title)) continue;
        const range = parseRange(title);
        out.push({
          key: new URL(href).searchParams.get('id')!,
          title: range ? title.replace(range.raw, '').trim() || title : title,
          startDate: range?.start,
          endDate: range?.end,
          tags: guessTags(title),
          imageUrl: banner,
          orderUrl: 'https://weborder.mos.com.tw/',
          sourceUrl: href,
        });
      } catch {
        // 單一活動頁失敗不影響其他
      }
    }
    if (!out.length) throw new Error('no activity pages parsed');
    return out;
  },
};

const burgerking: Source = {
  brand: 'burgerking',
  async crawl() {
    const base = 'https://www.burgerking.com.tw/coupon';
    const $ = await getHtml(base);
    const img = $('#imgcoupon').attr('src');
    if (!img) throw new Error('coupon image not found');
    return [
      {
        key: 'store-coupon',
        title: '門市優惠券（最新一期）',
        description: '最新一期門市優惠券，結帳時向店員出示畫面上的優惠券代號即可使用。',
        tags: ['外帶'],
        imageUrl: img,
        conditions: '優惠內容與代號以圖片為準，限門市使用。',
        orderUrl: 'https://www.burgerking.com.tw/',
        sourceUrl: base,
      },
    ];
  },
};

const SOURCES: Source[] = [kfc, pizzahut, dominos, tkk, mos, burgerking];

// ---------- merge & write ----------

async function readExisting(): Promise<Coupon[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

const sig = (c: Coupon) => JSON.stringify({ ...c, updatedAt: '', endDate: c.endDateEstimated ? '' : c.endDate });

async function main() {
  const existing = await readExisting();
  const prevById = new Map(existing.map((c) => [c.id, c]));
  const now = new Date().toISOString();

  const results = await Promise.all(
    SOURCES.map(async (src) => {
      try {
        const drafts = await src.crawl();
        if (!drafts.length) throw new Error('0 items');
        console.log(`[ok]   ${src.brand}: ${drafts.length} items`);
        return { src, drafts };
      } catch (err) {
        console.warn(`[skip] ${src.brand}: ${(err as Error).message} (keeping previous data)`);
        return { src, drafts: null };
      }
    }),
  );

  const succeeded = new Set(results.filter((r) => r.drafts).map((r) => r.src.brand));
  if (!succeeded.size) {
    console.log('All sources failed - data/coupons.json untouched.');
    return;
  }

  const next: Coupon[] = existing.filter((c) => !c.demo && !succeeded.has(c.brand));

  for (const { src, drafts } of results) {
    if (!drafts) continue;
    for (const { key, ...d } of drafts) {
      const id = `${src.brand}-${key}`;
      const prev = prevById.get(id);
      const coupon: Coupon = {
        ...d,
        id,
        brand: src.brand,
        startDate: d.startDate ?? prev?.startDate ?? today(),
        endDate: d.endDate ?? plusDays(ESTIMATED_DAYS),
        endDateEstimated: d.endDate ? undefined : true,
        updatedAt: prev?.updatedAt ?? now,
      };
      if (prev && sig(prev) !== sig(coupon)) coupon.updatedAt = now;
      next.push(JSON.parse(JSON.stringify(coupon))); // 去掉 undefined 欄位
    }
  }

  next.sort((a, b) => a.id.localeCompare(b.id));
  const out = JSON.stringify(next, null, 2) + '\n';
  const before = JSON.stringify([...existing].sort((a, b) => a.id.localeCompare(b.id)), null, 2) + '\n';
  if (out === before) {
    console.log('No changes - data/coupons.json untouched.');
    return;
  }
  await fs.writeFile(DATA_FILE, out, 'utf-8');
  console.log(`wrote ${next.length} coupons (${succeeded.size}/${SOURCES.length} sources ok)`);
}

main().catch((e) => {
  // 暫時性錯誤不讓排程紅燈；既有 JSON 不會被動到
  console.error('Crawler failed:', e);
  process.exit(0);
});
