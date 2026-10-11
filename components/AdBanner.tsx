import clsx from 'clsx';

export type AdSlot = 'top' | 'infeed' | 'sidebar' | 'sticky';

/**
 * 廣告版位封裝。目前為「贊助商廣告」灰底 Mock。
 * 接 AdSense 時：在此元件內渲染 <ins class="adsbygoogle" data-ad-slot=...>，
 * 並維持下方「固定尺寸」容器，避免載入後撐開版面造成 CLS。
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

export default function AdBanner({ slot, className }: { slot: AdSlot; className?: string }) {
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
      <span className="absolute left-2 top-1.5 text-[10px] font-medium tracking-wide">贊助</span>
      <span className="text-xs font-medium">贊助商廣告</span>
      <span className="text-[11px] opacity-70 tabular">{SIZE_LABEL[slot]}</span>
    </aside>
  );
}
