'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { ADSENSE_CLIENT, AD_SLOTS, INFEED_LAYOUT_KEY, adsEnabled } from '@/lib/ads';

export type AdSlot = 'top' | 'infeed' | 'sidebar' | 'sticky';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 廣告版位封裝：外層容器固定尺寸（避免 CLS），內層是 AdSense <ins>；
 * 未設定 AdSense 或該版位沒有廣告單元 ID 時，顯示灰底「贊助商廣告」佔位框。
 */
const SLOT_STYLE: Record<AdSlot, string> = {
  // 手機 320x50 / 平板 728x90 / 桌機 970x90 — 以固定高度預留，寬度自適應
  top: 'h-[50px] md:h-[90px] w-full rounded-xl',
  // 與優惠卡同尺寸（Grid 會撐滿同列高度）
  infeed: 'min-h-[360px] h-full rounded-2xl',
  // 300x600（lg 以上才顯示）
  sidebar: 'hidden lg:flex h-[600px] w-[300px] rounded-2xl',
  sticky: 'h-[50px] w-full max-w-[320px] rounded-md',
};

const SIZE_LABEL: Record<AdSlot, string> = {
  top: '728 × 90 / 320 × 50',
  infeed: '原生廣告',
  sidebar: '300 × 600',
  sticky: '320 × 50',
};

function AdUnit({ slot, adSlotId }: { slot: AdSlot; adSlotId: string }) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 版位有實際寬度才請求廣告：手機上隱藏的側邊欄（寬度 0）不送請求，
    // 背景分頁載入時寬度為 0 也會等到可見再送，避免 AdSense「availableWidth=0」錯誤
    const tryPush = () => {
      // 同一個 <ins> 只能 push 一次（React Strict Mode 會執行兩次 effect）
      if (el.dataset.adsbygoogleStatus) return true;
      if (el.offsetWidth === 0) return false;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // 廣告攔截器或腳本尚未載入：保留佔位框即可
      }
      return true;
    };

    if (tryPush()) return;
    const ro = new ResizeObserver(() => tryPush() && ro.disconnect());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fluid = slot === 'infeed' && INFEED_LAYOUT_KEY;
  return (
    <ins
      ref={ref}
      className={clsx('adsbygoogle', `adslot-${slot}`)}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={adSlotId}
      // 資訊流：有 layout key 用原生 fluid 格式；其餘依容器尺寸出固定大小廣告（不自動長高，避免 CLS）
      {...(fluid ? { 'data-ad-format': 'fluid', 'data-ad-layout-key': INFEED_LAYOUT_KEY } : {})}
    />
  );
}

export default function AdBanner({ slot, className }: { slot: AdSlot; className?: string }) {
  const adSlotId = slot === 'sticky' ? '' : AD_SLOTS[slot];
  // 正式環境：吸底版位交給 AdSense 錨定廣告，這裡不渲染任何東西
  if (adsEnabled && slot === 'sticky') return null;

  return (
    <aside
      aria-label="贊助商廣告"
      data-ad-slot={slot}
      className={clsx(
        'relative flex flex-col items-center justify-center gap-0.5 overflow-hidden border border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-500',
        SLOT_STYLE[slot],
        className,
      )}
    >
      <span className="absolute left-2 top-1.5 z-10 text-[10px] font-medium tracking-wide">廣告</span>
      {/* 佔位文字墊在廣告下方：廣告未填滿或被攔截時才會露出 */}
      <span className="text-xs font-medium">贊助商廣告</span>
      <span className="text-[11px] opacity-70 tabular">{SIZE_LABEL[slot]}</span>
      {adsEnabled && adSlotId && (
        // 固定尺寸版位以 margin-inline:auto 置中；fluid 資訊流撐滿卡片寬度
        <div className="absolute inset-0">
          <AdUnit slot={slot} adSlotId={adSlotId} />
        </div>
      )}
    </aside>
  );
}
