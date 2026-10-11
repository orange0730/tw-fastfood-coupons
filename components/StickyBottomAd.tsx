'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { adsEnabled } from '@/lib/ads';
import AdBanner from './AdBanner';

/**
 * 手機吸底橫幅佔位：固定高度 + 關閉鈕；main 需配合 pb-24 避免遮擋內容。
 * 啟用 AdSense 後改用官方「錨定廣告」（見 lib/ads.ts），此元件不渲染。
 */
export default function StickyBottomAd() {
  const [open, setOpen] = useState(true);
  if (!open || adsEnabled) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex h-[60px] items-center justify-center border-t border-stone-200 bg-white/95 px-12 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-stone-800 dark:bg-stone-900/95">
      <AdBanner slot="sticky" />
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="關閉廣告"
        className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
