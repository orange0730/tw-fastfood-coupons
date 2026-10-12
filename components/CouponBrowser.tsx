'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, CircleAlert, RefreshCw, SearchX, ShieldCheck, Zap } from 'lucide-react';
import { countByBrand, queryCoupons, todayTaipei } from '@/lib/query';
import type { Coupon, CrawlMeta, SortKey } from '@/types/coupon';
import AdBanner from './AdBanner';
import BrandBar from './BrandBar';
import CouponCard from './CouponCard';
import Header from './Header';
import SourcesPanel, { fmtTaipei } from './SourcesPanel';
import StickyBottomAd from './StickyBottomAd';
import TagFilter from './TagFilter';
import Toast from './Toast';

const AD_EVERY = 7; // 每 7 張卡片插入一則原生廣告

const SORT_LABEL: Record<SortKey, string> = {
  expiring_soon: '即將截止',
  newest: '最新上架',
  discount: '折扣最多',
};

interface Props {
  coupons: Coupon[];
  updatedAt: string | null;
  meta: CrawlMeta | null;
  /** 建置當天（台北時區）。首次渲染沿用它以吻合靜態 HTML，掛載後再換成使用者的今天 */
  buildDate: string;
}

export default function CouponBrowser({ coupons, updatedAt, meta, buildDate }: Props) {
  const [brand, setBrand] = useState('all');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<SortKey>('expiring_soon');
  const [query, setQuery] = useState('');
  const [today, setToday] = useState(buildDate);
  const [stale, setStale] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 靜態頁面可能在建置數天後才被開啟：重新以當下日期計算剩餘天數與過期狀態
  useEffect(() => setToday(todayTaipei()), []);

  // 每日排程超過 36 小時沒跑（GitHub 排程延遲通常數小時內），提醒使用者資料可能不是最新
  const checkedAt = meta?.checkedAt ?? updatedAt;
  useEffect(() => {
    if (checkedAt) setStale(Date.now() - Date.parse(checkedAt) > 36 * 3600_000);
  }, [checkedAt]);

  // 品牌數量以「除了品牌以外的條件」計算，讓品牌列顯示切換後會看到幾筆
  const withoutBrand = useMemo(() => queryCoupons(coupons, { tag, q: query, sort, today }), [coupons, tag, query, sort, today]);
  const brandCounts = useMemo(() => countByBrand(withoutBrand), [withoutBrand]);
  const items = brand === 'all' ? withoutBrand : withoutBrand.filter((c) => c.brand === brand);

  const onCopied = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const reset = () => {
    setBrand('all');
    setTag('');
    setQuery('');
  };

  const filtered = brand !== 'all' || !!tag || !!query.trim();

  return (
    <>
      <Header query={query} onQuery={setQuery} />

      {/* 1. 頂部通欄：在 Header 下方、不覆蓋導航 */}
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <AdBanner slot="top" />
      </div>

      {/* pb-24：為手機吸底廣告預留空間，避免遮擋最後一排操作按鈕 */}
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 lg:pb-12">
        <section aria-labelledby="page-title" className="mb-5">
          <h1 id="page-title" className="text-2xl font-black tracking-tight sm:text-3xl">
            今天吃速食，先查優惠
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              全部取自品牌官網
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              一鍵複製代碼、直達點餐頁
            </span>
            <span className="inline-flex items-center gap-1.5 tabular">
              <RefreshCw className="h-3.5 w-3.5" />
              {Object.keys(countByBrand(queryCoupons(coupons, { today }))).length} 個品牌 · 每日自動更新 · 最後檢查 {fmtTaipei(checkedAt)}
            </span>
          </p>
          {stale && (
            <p role="status" className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              資料已超過一天半未更新，部分優惠可能已調整，使用前請以官網為準。
            </p>
          )}
        </section>

        <div className="space-y-3">
          <BrandBar value={brand} onChange={setBrand} counts={brandCounts} />
          <TagFilter value={tag} onChange={setTag} />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-200 pt-4 dark:border-stone-800">
          <p className="text-sm text-stone-600 dark:text-stone-400" aria-live="polite">
            共 <strong className="font-bold text-stone-900 tabular dark:text-stone-100">{items.length}</strong> 則優惠
            {filtered && (
              <button type="button" onClick={reset} className="ml-2 font-medium text-red-600 hover:underline dark:text-red-400">
                清除篩選
              </button>
            )}
          </p>
          <label className="relative flex items-center">
            <span className="sr-only">排序方式</span>
            <ArrowDownUp className="pointer-events-none absolute left-3 h-4 w-4 text-stone-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 cursor-pointer appearance-none rounded-xl border border-stone-200 bg-white pl-9 pr-4 text-sm font-medium text-stone-800 hover:border-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-start gap-6">
          <section className="min-w-0 flex-1" aria-label="優惠列表">
            {items.length === 0 ? (
              <EmptyState
                title={coupons.length ? '找不到符合的優惠' : '目前沒有優惠資料'}
                hint={coupons.length ? '換個關鍵字，或清除篩選條件看看。' : '資料每日自動更新，請稍後再回來看看。'}
                action="清除篩選"
                onAction={reset}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((c, i) => (
                  <Fragment key={c.id}>
                    <CouponCard coupon={c} onCopied={onCopied} />
                    {/* 2. 資訊流原生廣告：同卡片尺寸 */}
                    {(i + 1) % AD_EVERY === 0 && i !== items.length - 1 && <AdBanner slot="infeed" />}
                  </Fragment>
                ))}
              </div>
            )}
          </section>

          {/* 3. 桌面側邊欄：lg 以上才顯示，sticky 跟隨捲動 */}
          <div className="sticky top-24 hidden shrink-0 lg:block">
            <AdBanner slot="sidebar" />
          </div>
        </div>

        <SourcesPanel meta={meta} />
      </main>

      <footer className="border-t border-stone-200 pb-24 pt-8 text-xs leading-relaxed text-stone-500 lg:pb-8 dark:border-stone-800 dark:text-stone-400">
        <div className="mx-auto max-w-7xl px-4">
          <p>本站為非官方優惠彙整，與各品牌無合作關係。品牌名稱與商標屬各權利人所有。</p>
          <p className="mt-1">優惠內容、價格與期限以各品牌官網及門市公告為準；資料每日清晨自動檢查更新。</p>
          <p className="mt-3">
            <Link href="/privacy/" className="font-medium text-stone-600 underline-offset-2 hover:underline dark:text-stone-300">
              隱私權政策
            </Link>
          </p>
        </div>
      </footer>

      {/* 4. 手機吸底橫幅 */}
      <StickyBottomAd />
      <Toast message={toast} />
    </>
  );
}

function EmptyState({ title, hint, action, onAction }: { title: string; hint: string; action: string; onAction: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-20 text-center dark:border-stone-700 dark:bg-stone-900">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-stone-100 dark:bg-stone-800">
        <SearchX className="h-6 w-6 text-stone-400" />
      </span>
      <p className="mt-4 text-base font-bold">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{hint}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-5 h-11 rounded-xl bg-stone-900 px-5 text-sm font-bold text-white transition-colors hover:bg-stone-700 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
      >
        {action}
      </button>
    </div>
  );
}
