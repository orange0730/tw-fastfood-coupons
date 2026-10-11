'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ArrowUpRight, CalendarClock, Check, ChevronDown, Copy, ExternalLink, Sparkles } from 'lucide-react';
import { BRAND_MAP } from '@/lib/brands';
import type { CouponView } from '@/types/coupon';
import BrandMark from './BrandMark';

/** 寫入剪貼簿；非 HTTPS / 舊瀏覽器 fallback 到 execCommand */
function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  legacyCopy(text);
  return Promise.resolve();
}
function legacyCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

function Expiry({ c }: { c: CouponView }) {
  if (c.expired) return <span className="text-xs font-medium text-stone-400">已過期</span>;
  if (c.endDateEstimated) return <span className="text-xs text-stone-500 dark:text-stone-400">期限依官網公告</span>;
  const soon = c.daysLeft <= 7;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-xs font-medium tabular',
        soon ? 'rounded-md bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'text-stone-500 dark:text-stone-400',
      )}
    >
      <CalendarClock className="h-3.5 w-3.5" />
      {c.daysLeft === 0 ? '今天截止' : soon ? `剩 ${c.daysLeft} 天` : `${c.endDate.slice(5).replace('-', '/')} 截止`}
    </span>
  );
}

function Cover({ c }: { c: CouponView }) {
  const [failed, setFailed] = useState(false);
  // 官方圖片比例不一（肯德基券面 5:7 直式、漢堡王整張券頁）：
  // 接近 4:3 的照片滿版裁切；直式/方形券面完整顯示，背景鋪同圖模糊放大
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  const brand = BRAND_MAP[c.brand];
  // 官方圖床皆允許外站引用（2026-10 驗證）；不送 Referer 以降低被擋機率
  const src = c.imageUrl ?? '';
  const measure = (img: HTMLImageElement) => {
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w) setFailed(true);
    else if (w / h < 1.15) setFit('contain');
  };

  return (
    // 固定比例容器，圖片載入前後高度不變，避免 CLS
    <div className="relative aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-800">
      {c.imageUrl && !failed ? (
        <>
          {fit === 'contain' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            // 靜態 HTML 的圖片可能在 hydration 前就載入完成（onLoad 不會觸發），掛載時補判斷一次
            ref={(el) => {
              if (el?.complete) measure(el);
            }}
            src={src}
            alt={c.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            onLoad={(e) => measure(e.currentTarget)}
            className={clsx(
              'relative h-full w-full transition-transform duration-300',
              fit === 'cover' ? 'object-cover group-hover:scale-[1.03]' : 'object-contain drop-shadow-md',
            )}
          />
        </>
      ) : (
        <div className="grid h-full place-items-center" style={{ backgroundColor: `${brand.color}14` }}>
          <BrandMark brand={c.brand} size="lg" />
        </div>
      )}
      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
        {c.discountPercent != null && c.discountPercent >= 5 && (
          <span className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-sm tabular">
            省 {c.discountPercent}%
          </span>
        )}
        {c.tags.includes('APP 專屬') && (
          <span className="rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold text-stone-800 shadow-sm">APP 專屬</span>
        )}
        {c.demo && <span className="rounded-lg bg-stone-900/80 px-2 py-1 text-xs font-medium text-white">示範資料</span>}
      </div>
    </div>
  );
}

export default function CouponCard({ coupon: c, onCopied }: { coupon: CouponView; onCopied: (msg: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const brand = BRAND_MAP[c.brand];
  const orderUrl = c.orderUrl ?? brand.orderUrl;

  const copy = (msg: string) => {
    if (!c.code) return;
    void writeClipboard(c.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    onCopied(msg);
  };

  // 主要動作：一鍵前往官方點餐頁
  //  - 連結已帶入代碼（肯德基 / 達美樂）→ 直接開啟
  //  - 有代碼但需手動輸入 → 開啟的同時複製代碼，到結帳頁貼上即可
  const needsManualCode = !!c.code && !c.codeAutoApplied;
  const ctaLabel = c.expired ? '已過期' : orderUrl ? (needsManualCode ? '複製代碼並點餐' : '前往點餐') : '查看活動';
  const ctaHref = c.expired ? undefined : (orderUrl ?? c.sourceUrl);

  return (
    <article
      className={clsx(
        'group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition-shadow duration-200 hover:shadow-lg hover:shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900 dark:hover:shadow-black/30',
        c.expired && 'opacity-60 grayscale',
      )}
    >
      <Cover c={c} />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
            <BrandMark brand={c.brand} size="xs" />
            {brand.name}
          </span>
          <Expiry c={c} />
        </div>

        <h3 className="mt-2.5 line-clamp-2 text-[15px] font-bold leading-snug text-stone-900 dark:text-stone-50">{c.title}</h3>
        {c.description && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">{c.description}</p>
        )}

        {c.discountPrice != null && (
          <div className="mt-3 flex items-baseline gap-2 tabular">
            <span className="text-2xl font-black tracking-tight text-red-600 dark:text-red-400">
              <span className="mr-0.5 text-base font-bold">$</span>
              {c.discountPrice.toLocaleString()}
              {c.priceFrom && <span className="ml-0.5 text-sm font-bold">起</span>}
            </span>
            {c.originalPrice != null && (
              <span className="text-sm text-stone-400 line-through">${c.originalPrice.toLocaleString()}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-4">
          {c.code && (
            // 票券造型：左右半圓缺口 + 虛線分隔
            <div className="relative mb-3 flex items-center justify-between rounded-xl border border-dashed border-stone-300 bg-stone-50 py-2 pl-3.5 pr-1.5 dark:border-stone-700 dark:bg-stone-950/40">
              <span className="absolute -left-[7px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-dashed border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900" />
              <span className="absolute -right-[7px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-dashed border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900" />
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  {c.codeAutoApplied ? '優惠代碼 · 點餐時自動帶入' : '優惠代碼'}
                </span>
                <span className="block truncate font-mono text-lg font-bold tracking-wider text-stone-900 dark:text-stone-50">
                  {c.code}
                </span>
              </span>
              <button
                type="button"
                onClick={() => copy(`已複製優惠代碼 ${c.code}`)}
                disabled={c.expired}
                aria-label={`複製優惠代碼 ${c.code}`}
                className={clsx(
                  'flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed',
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700 dark:hover:bg-stone-700',
                )}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? '已複製' : '複製'}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-disabled={!ctaHref}
              onClick={() => needsManualCode && copy(`已複製 ${c.code}，到結帳頁貼上即可`)}
              className={clsx(
                'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-colors duration-150',
                ctaHref
                  ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                  : 'pointer-events-none bg-stone-200 text-stone-500 dark:bg-stone-800',
              )}
            >
              {c.codeAutoApplied && ctaHref && <Sparkles className="h-4 w-4" />}
              {ctaLabel}
              {ctaHref && <ArrowUpRight className="h-4 w-4" />}
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={`${c.id}-details`}
              aria-label="使用說明"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <ChevronDown className={clsx('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
            </button>
          </div>

          {open && (
            <div id={`${c.id}-details`} className="mt-3 space-y-2 rounded-xl bg-stone-50 p-3 text-[13px] leading-relaxed text-stone-600 dark:bg-stone-950/40 dark:text-stone-300">
              {c.conditions && <p>{c.conditions}</p>}
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs tabular">
                {c.startDate && (
                  <>
                    <dt className="text-stone-400">開始</dt>
                    <dd>{c.startDate}</dd>
                  </>
                )}
                <dt className="text-stone-400">截止</dt>
                <dd>{c.endDateEstimated ? '官方未公布，依官網為準' : c.endDate}</dd>
                {c.tags.length > 0 && (
                  <>
                    <dt className="text-stone-400">分類</dt>
                    <dd>{c.tags.join('、')}</dd>
                  </>
                )}
              </dl>
              <a
                href={c.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                官方活動頁 <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
