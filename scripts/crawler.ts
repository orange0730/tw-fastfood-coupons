/**
 * 爬蟲：抓取各品牌公開優惠 → 合併進 data/coupons.json
 *
 * 來源（2026-10 驗證可用）：
 *   - 肯德基   olo-api.kfcclub.com.tw/menu/v1/QueryCoupons（官網優惠券頁使用的公開 API）
 *   - 必勝客   www.pizzahut.com.tw/promotions/（伺服器端渲染的優惠清單）
 *   - 達美樂   www.dominos.com.tw 首頁帶 ?vc= 優惠代碼的訂購連結
 *   - 頂呱呱   www.tkkfriedchicken.com/event.html 活動快訊
 *   - 摩斯     www.mos.com.tw 首頁活動 Banner → 各活動頁
 *   - 漢堡王   www.burgerking.com.tw/category/6 官網訂餐「優惠券」分類 + /coupon 門市優惠券（圖片）
 *   - 麥當勞   www.mcdonalds.com/tw 「最新活動」各活動頁（優惠券本身只在 App 內，這裡收錄官網公告的優惠活動）
 *   Subway 台灣官網沒有公開優惠資訊，暫不收錄。
 *
 * 合併規則：
 *   1. 來源成功 → 該品牌的爬蟲資料以本次結果「整批取代」（官方下架即消失）。
 *   2. 來源失敗 → 保留該品牌上次的資料（優雅 Fallback），不影響其他品牌。
 *   3. 只要有任一來源成功，就移除 seed 產生的示範資料。
 *   4. 優惠內容沒變就不改寫 coupons.json。
 *   5. 每次執行都更新 data/meta.json（檢查時間、各來源狀態），網站據此顯示「最後檢查」與資料來源；
 *      每日一次的 commit 也讓公開 repo 的排程不會因 60 天無活動被 GitHub 自動停用。
 *
 * 請遵守各站 robots.txt 與使用條款，並維持低頻率（每日一次）。
 */
import { promises as fs } from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import type { BrandId, Coupon } from '../types/coupon';

const DATA_FILE = path.join(process.cwd(), 'data', 'coupons.json');
const META_FILE = path.join(process.cwd(), 'data', 'meta.json');
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
  /** 顯示在網站「資料來源」的名稱 */
  label: string;
  /** 來源頁（給使用者查證） */
  url: string;
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

/** 限制同時連線數，避免對官網造成負擔 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// 官網文字常夾帶 emoji 與零寬空白；網站設計上不使用 emoji，一律在入庫前移除
const clean = (s: string | undefined) =>
  (s ?? '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200B}-\u{200D}\u{2060}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
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
  label: '肯德基官網「優惠券」',
  url: 'https://www.kfcclub.com.tw/coupon',
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
  label: '必勝客官網「優惠推薦」',
  url: 'https://www.pizzahut.com.tw/promotions/',
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
  label: '達美樂官網首頁優惠',
  url: 'https://www.dominos.com.tw/',
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
  label: '頂呱呱官網「活動快訊」',
  url: 'https://www.tkkfriedchicken.com/event.html',
  async crawl() {
    const base = 'https://www.tkkfriedchicken.com/event.html';
    const $ = await getHtml(base);
    const out: Draft[] = [];
    $('.announcement--content').each((_, el) => {
      const $el = $(el);
      const href = $el.find('a.announcement--pic').attr('href') ?? '';
      const m = decodeURIComponent(href).match(/^eventContent_(\d+)_(.+)\.html$/);
      if (!m) return;
      const id = m[1];
      const fullTitle = clean(m[2]);
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
  label: '摩斯官網首頁活動',
  url: 'https://www.mos.com.tw/',
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

const BK = 'https://www.burgerking.com.tw';
const BK_SECTION_TAGS: Record<string, string[]> = {
  買一送一: ['買一送一'],
  單人獨享餐: ['套餐'],
  雙人分享餐: ['套餐'],
};

const burgerking: Source = {
  brand: 'burgerking',
  label: '漢堡王官網「優惠券」',
  url: `${BK}/category/6`,
  async crawl() {
    const base = `${BK}/category/6`;
    const $ = await getHtml(base);

    // 同一商品可能同時出現在多個分類（例：買一送一 + 官網獨家），合併分類名稱
    const items = new Map<string, { name: string; price?: number; img?: string; url: string; sections: string[] }>();
    $('section').each((_, sec) => {
      const section = clean($(sec).find('h2').first().text());
      $(sec)
        .find('a[href*="/product/"]')
        .each((_, a) => {
          const href = $(a).attr('href') ?? '';
          const id = href.match(/product\/(\d+)/)?.[1];
          const name = clean($(a).find('div.text-center').first().text());
          if (!id || !name) return;
          const prev = items.get(id);
          if (prev) {
            if (section && !prev.sections.includes(section)) prev.sections.push(section);
            return;
          }
          items.set(id, {
            name,
            price: num($(a).children('div').last().text()),
            img: $(a).find('img').attr('src') || undefined,
            url: new URL(href, BK).toString(),
            sections: section ? [section] : [],
          });
        });
    });
    if (!items.size) throw new Error('no products in coupon category');

    // 商品頁的 meta description 是一句優惠說明（例：「限時 5 折超划算！」）
    const entries = [...items];
    const descs = await mapLimit(entries, 4, async ([, it]) => {
      try {
        const $p = await getHtml(it.url);
        return clean($p('meta[name="description"]').attr('content'));
      } catch {
        return '';
      }
    });

    const out: Draft[] = entries.map(([id, it], i) => {
      // 「漢堡王雙人餐｜國王特選雙人餐：最高現省$150！」→「最高現省$150！」
      const desc = descs[i].replace(/^[^｜]*｜/, '').replace(/^[^：]{1,24}：/, '');
      const title = it.name.replace(/^[(（]官網獨家[)）]\s*/, '');
      const tags = new Set(guessTags(`${it.name} ${desc} ${it.sections.join(' ')}`));
      for (const s of it.sections) for (const t of BK_SECTION_TAGS[s] ?? []) tags.add(t);
      return {
        key: id,
        title,
        description: desc && desc !== title ? desc : undefined,
        discountPrice: it.price,
        tags: withPriceTag([...tags], it.price),
        imageUrl: it.img,
        conditions: `${it.sections.join('、') || '優惠券'}。官網線上訂購價格，實際供應以結帳頁為準。`,
        orderUrl: it.url,
        sourceUrl: base,
      };
    });

    // 門市臨櫃 / 自助點餐機用的當期優惠券（整頁圖片）
    try {
      const $c = await getHtml(`${BK}/coupon`);
      const img = $c('#imgcoupon').attr('src');
      if (img)
        out.push({
          key: 'store-coupon',
          title: '門市優惠券（最新一期）',
          description: '臨櫃或自助點餐機使用的當期優惠券，結帳時出示畫面上的優惠券代號即可。',
          tags: ['外帶'],
          imageUrl: img,
          conditions: '優惠內容與代號以圖片為準，限門市使用。',
          orderUrl: `${BK}/coupon`,
          sourceUrl: `${BK}/coupon`,
        });
    } catch {
      // 門市券頁失敗不影響線上優惠券
    }
    return out;
  },
};

const MCD = 'https://www.mcdonalds.com';
// 「最新活動」裡也有徵才、問卷、捐血、餐點推薦文等非優惠頁面
const MCD_PROMO = /優惠|買\s*[A-Za-z一1]\s*送|\$\s?\d{2,4}|\d{2,4}\s*元|折|免費|贈|加購|特價|半價/;
const MCD_EXCLUDE = /中獎名單|問卷|調查|招募|捐血|音樂|環保|循環|購物袋|生日派對|企業|B2B|吃什麼/i;

/** 從活動頁內文找截止日：「至2027年3月31日」優先，其次「9/23-10/13」 */
function mcdEndDate(text: string): { start?: string; end?: string } {
  const pad = (n: string) => n.padStart(2, '0');
  const full = text.match(/至\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (full) return { end: `${full[1]}-${pad(full[2])}-${pad(full[3])}` };
  const range = parseRange(text);
  return range ? { start: range.start, end: range.end } : {};
}

async function parseMcdPage(url: string): Promise<Draft | null> {
  const $ = await getHtml(url);
  const title = clean($('title').text()).split(/[｜|]/)[0].trim();
  const desc = clean($('meta[name="description"]').attr('content'));
  const hero = $('img')
    .filter((_, el) => ($(el).attr('src') ?? '').includes('/content/dam/sites/tw/hero/'))
    .first();
  const heroAlt = clean(hero.attr('alt'));
  $('script, style, noscript, header, footer, nav').remove();
  const body = clean($('body').text());

  const head = `${title} ${desc} ${heroAlt}`;
  // 有些活動頁標題只寫品名，優惠價只出現在內文（例：辣味麥克鷄塊「套餐加點優惠價 $59」）
  const promo = MCD_PROMO.test(head) || /(?:優惠價|特價)\s*\$?\s*\d{2,4}/.test(body);
  if (!title || !promo || MCD_EXCLUDE.test(head)) return null;

  const { start, end } = mcdEndDate(body);
  if (end && end < today()) return null; // 已結束的活動頁

  // 「優惠價 $59」「只要$39」；多個價格取最低並標示「起」
  const prices = [...body.matchAll(/(?:只要|優惠價|特價|雙享價)\s*\$?\s*(\d{2,4})/g)].map((m) => Number(m[1]));
  const price = prices.length ? Math.min(...prices) : undefined;
  const notes = body.match(/注意事項\s*(.{10,160}?)(?:[。；]|$)/)?.[1];

  return {
    key: url.split('/').pop()!.replace(/\.html$/, ''),
    title,
    description: heroAlt && heroAlt !== title ? heroAlt : desc.slice(0, 80) || undefined,
    discountPrice: price,
    priceFrom: new Set(prices).size > 1 || undefined,
    // 麥當勞優惠集中在 App（甜心卡數位卡、歡樂送專屬券等）
    tags: withPriceTag([...new Set([...guessTags(head), ...(/APP/i.test(head) ? ['APP 專屬'] : [])])], price),
    startDate: start,
    endDate: end,
    imageUrl: hero.attr('src') ? new URL(hero.attr('src')!, MCD).toString() : undefined,
    conditions: notes ? `${notes}。` : '實際優惠內容以麥當勞APP及門市公告為準。',
    sourceUrl: url,
  };
}

const mcdonalds: Source = {
  brand: 'mcdonalds',
  label: '麥當勞官網「最新活動」',
  url: `${MCD}/tw/zh-tw/whats-hot.html`,
  async crawl() {
    const $ = await getHtml(`${MCD}/tw/zh-tw/whats-hot.html`);
    const pages = new Set<string>([`${MCD}/tw/zh-tw/digital/mcdapp.html`]);
    $('a[href*="/tw/zh-tw/whats-hot/"]').each((_, a) => {
      pages.add(new URL($(a).attr('href')!, MCD).toString().split(/[?#]/)[0]);
    });
    const parsed = await mapLimit([...pages].slice(0, 40), 4, (u) => parseMcdPage(u).catch(() => null));
    const out = parsed.filter((d): d is Draft => d !== null);
    if (!out.length) throw new Error('no promotion pages parsed');
    return out;
  },
};

const SOURCES: Source[] = [mcdonalds, kfc, pizzahut, dominos, mos, burgerking, tkk];

// ---------- merge & write ----------

interface SourceStatus {
  brand: BrandId;
  label: string;
  url: string;
  ok: boolean;
  count: number;
  /** 最近一次成功抓取的時間；失敗時沿用上次 */
  lastSuccess?: string;
  error?: string;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

const sig = (c: Coupon) => JSON.stringify({ ...c, updatedAt: '', endDate: c.endDateEstimated ? '' : c.endDate });

async function main() {
  const existing = await readJson<Coupon[]>(DATA_FILE, []);
  const prevMeta = await readJson<{ sources?: SourceStatus[] }>(META_FILE, {});
  const prevById = new Map(existing.map((c) => [c.id, c]));
  const now = new Date().toISOString();

  const results = await Promise.all(
    SOURCES.map(async (src) => {
      try {
        const drafts = await src.crawl();
        if (!drafts.length) throw new Error('0 items');
        console.log(`[ok]   ${src.brand}: ${drafts.length} items`);
        return { src, drafts, error: undefined };
      } catch (err) {
        const error = (err as Error).message;
        console.warn(`[skip] ${src.brand}: ${error} (keeping previous data)`);
        return { src, drafts: null, error };
      }
    }),
  );

  const succeeded = new Set(results.filter((r) => r.drafts).map((r) => r.src.brand));
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

  // 各來源狀態：網站「資料來源」區塊顯示，失敗的來源也看得到上次成功時間
  const prevStatus = new Map((prevMeta.sources ?? []).map((s) => [s.brand, s]));
  const sources: SourceStatus[] = results.map(({ src, drafts, error }) => ({
    brand: src.brand,
    label: src.label,
    url: src.url,
    ok: !!drafts,
    count: next.filter((c) => c.brand === src.brand).length,
    lastSuccess: drafts ? now : prevStatus.get(src.brand)?.lastSuccess,
    error: error?.slice(0, 120),
  }));
  await fs.writeFile(META_FILE, JSON.stringify({ checkedAt: now, sources }, null, 2) + '\n', 'utf-8');

  if (!succeeded.size) {
    console.log('All sources failed - data/coupons.json untouched.');
    return;
  }

  next.sort((a, b) => a.id.localeCompare(b.id));
  const out = JSON.stringify(next, null, 2) + '\n';
  const before = JSON.stringify([...existing].sort((a, b) => a.id.localeCompare(b.id)), null, 2) + '\n';
  if (out === before) {
    console.log('No coupon changes - data/coupons.json untouched.');
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
