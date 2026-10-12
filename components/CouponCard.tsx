'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ArrowUpRight, CalendarClock, Check, ChevronDown, Copy, ExternalLink, Globe, Smartphone, Sparkles } from 'lucide-react';
import { BRAND_MAP } from '@/lib/brands';
import type { CouponView } from '@/types/coupon';
import BrandMark from './BrandMark';

const BTN_PRIMARY =
  'flex h-11 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-red-700 active:bg-red-800';
const BTN_SECONDARY =
  'flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition-colors duration-150 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800';

/** 點擊當下判斷裝置（不在 render 時判斷，避免與靜態 HTML 不一致） */
function detectPlatform(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent;
  // iPadOS 13+ 的 UA 與 Mac 相同，以觸控點數區分
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

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
  const [storePicker, setStorePicker] = useState(false);
  const brand = BRAND_MAP[c.brand];
  const orderUrl = c.orderUrl ?? brand.orderUrl;
  const app = c.expired ? undefined : brand.app;

  const copy = (msg: string): Promise<void> => {
    if (!c.code) return Promise.resolve();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    onCopied(msg);
    return writeClipboard(c.code);
  };

  // 一鍵開 App：先複製代碼（App 內需手動輸入），再依系統開啟商店頁（已安裝會顯示「打開」）；
  // 電腦上沒有 App 可開，改在卡片內展開兩個商店連結
  const openApp = async () => {
    if (!app) return;
    const platform = detectPlatform();
    const url = platform === 'ios' ? app.ios : platform === 'android' ? app.android : undefined;
    if (!url) {
      setStorePicker((v) => !v);
      return;
    }
    if (c.code) await copy(`已複製 ${c.code}，在 App 結帳時貼上`).catch(() => undefined);
    window.location.href = url;
  };

  // 主要動作：
  //  - 有網頁點餐 → 「前往點餐」（肯德基 / 達美樂的連結已帶入代碼；其他品牌有代碼則同時複製）
  //  - 只有 App 能用的優惠（麥當勞、APP 專屬）→ 「開啟 App」為主，官網為輔
  const needsManualCode = !!c.code && !c.codeAutoApplied;
  const appFirst = !!app && (!orderUrl || c.tags.includes('APP 專屬'));
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
            {appFirst ? (
              <>
                <button type="button" onClick={openApp} className={clsx(BTN_PRIMARY, 'flex-1')}>
                  <Smartphone className="h-4 w-4" />
                  開啟 App
                </button>
                {ctaHref && (
                  <a
                    href={ctaHref}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={() => needsManualCode && copy(`已複製 ${c.code}，到結帳頁貼上即可`)}
                    className={BTN_SECONDARY}
                  >
                    <Globe className="h-4 w-4" />
                    官網
                  </a>
                )}
              </>
            ) : (
              <>
                <a
                  href={ctaHref}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-disabled={!ctaHref}
                  onClick={() => needsManualCode && copy(`已複製 ${c.code}，到結帳頁貼上即可`)}
                  className={clsx(
                    'flex-1',
                    ctaHref ? BTN_PRIMARY : 'pointer-events-none flex h-11 items-center justify-center rounded-xl bg-stone-200 text-sm font-bold text-stone-500 dark:bg-stone-800',
                  )}
                >
                  {c.codeAutoApplied && ctaHref && <Sparkles className="h-4 w-4" />}
                  {ctaLabel}
                  {ctaHref && <ArrowUpRight className="h-4 w-4" />}
                </a>
                {app && (
                  <button type="button" onClick={openApp} aria-label={`開啟 ${app.name}`} className={BTN_SECONDARY}>
                    <Smartphone className="h-4 w-4" />
                    App
                  </button>
                )}
              </>
            )}
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

          {storePicker && app && (
            <div className="mt-3 rounded-xl bg-stone-50 p-3 text-[13px] leading-relaxed text-stone-600 dark:bg-stone-950/40 dark:text-stone-300">
              <p>
                在手機上點「App」會直接開啟 <strong className="font-semibold text-stone-800 dark:text-stone-100">{app.name}</strong>{' '}
                的商店頁，已安裝會顯示「打開」。
                {c.code && <> 優惠代碼 <span className="font-mono font-semibold">{c.code}</span> 請在 App 結帳時輸入。</>}
              </p>
              <div className="mt-2.5 flex gap-2">
                {app.ios && (
                  <a href={app.ios} target="_blank" rel="noopener noreferrer" className={clsx(BTN_SECONDARY, 'flex-1')}>
                    App Store
                  </a>
                )}
                {app.android && (
                  <a href={app.android} target="_blank" rel="noopener noreferrer" className={clsx(BTN_SECONDARY, 'flex-1')}>
                    Google Play
                  </a>
                )}
              </div>
            </div>
          )}

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
