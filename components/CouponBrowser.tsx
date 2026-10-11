'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownUp, RefreshCw, SearchX, ShieldCheck, Zap } from 'lucide-react';
import type { CouponView, CouponsResponse, SortKey } from '@/types/coupon';
import AdBanner from './AdBanner';
import BrandBar from './BrandBar';
import CouponCard from './CouponCard';
import CouponCardSkeleton from './CouponCardSkeleton';
import Header from './Header';
import StickyBottomAd from './StickyBottomAd';
import TagFilter from './TagFilter';
import Toast from './Toast';

const AD_EVERY = 7; // 每 7 張卡片插入一則原生廣告

const SORT_LABEL: Record<SortKey, string> = {
  expiring_soon: '即將截止',
  newest: '最新上架',
  discount: '折扣最多',
};

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const fmtUpdated = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(iso))
    : '—';

export default function CouponBrowser() {
  const [brand, setBrand] = useState('all');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<SortKey>('expiring_soon');
  const [query, setQuery] = useState('');
  const q = useDebounced(query, 250);

  const [data, setData] = useState<CouponsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ sort });
    if (brand !== 'all') params.set('brand', brand);
    if (tag) params.set('tag', tag);
    if (q.trim()) params.set('q', q.trim());

    setLoading(true);
    setError(false);
    fetch(`/api/coupons?${params}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: CouponsResponse) => setData(d))
      .catch((e) => e?.name !== 'AbortError' && setError(true))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [brand, tag, sort, q, reloadKey]);

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

  const items: CouponView[] = data?.items ?? [];
  const brandCount = Object.keys(data?.brandCounts ?? {}).length;
  const filtered = brand !== 'all' || !!tag || !!q.trim();

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
              {data ? `${brandCount} 個品牌 · 更新於 ${fmtUpdated(data.updatedAt)}` : '載入中'}
            </span>
          </p>
        </section>

        <div className="space-y-3">
          <BrandBar value={brand} onChange={setBrand} counts={data?.brandCounts ?? null} />
          <TagFilter value={tag} onChange={setTag} />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-200 pt-4 dark:border-stone-800">
          <p className="text-sm text-stone-600 dark:text-stone-400" aria-live="polite">
            {loading && !data ? (
              '載入中…'
            ) : (
              <>
                共 <strong className="font-bold text-stone-900 tabular dark:text-stone-100">{items.length}</strong> 則優惠
                {filtered && (
                  <button type="button" onClick={reset} className="ml-2 font-medium text-red-600 hover:underline dark:text-red-400">
                    清除篩選
                  </button>
                )}
              </>
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
          <section className="min-w-0 flex-1" aria-busy={loading} aria-label="優惠列表">
            {loading && !data ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <CouponCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <EmptyState title="資料載入失敗" hint="可能是網路不穩，請稍後再試。" action="重新載入" onAction={() => setReloadKey((k) => k + 1)} />
            ) : items.length === 0 ? (
              <EmptyState title="找不到符合的優惠" hint="換個關鍵字，或清除篩選條件看看。" action="清除篩選" onAction={reset} />
            ) : (
              <div className={`grid gap-4 transition-opacity duration-150 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
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
      </main>

      <footer className="border-t border-stone-200 pb-24 pt-8 text-xs leading-relaxed text-stone-500 lg:pb-8 dark:border-stone-800 dark:text-stone-400">
        <div className="mx-auto max-w-7xl px-4">
          <p>本站為非官方優惠彙整，與各品牌無合作關係。品牌名稱與商標屬各權利人所有。</p>
          <p className="mt-1">優惠內容、價格與期限以各品牌官網及門市公告為準；資料每日台灣時間 04:00 自動更新。</p>
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
