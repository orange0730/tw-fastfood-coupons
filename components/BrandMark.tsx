import clsx from 'clsx';
import { BRAND_MAP } from '@/lib/brands';
import type { BrandId } from '@/types/coupon';

const SIZE = {
  xs: 'h-5 w-5 text-[8px] rounded',
  sm: 'h-7 w-7 text-[9px] rounded-md',
  md: 'h-9 w-9 text-[11px] rounded-lg',
  lg: 'h-14 w-14 text-base rounded-xl',
};

/** 品牌標記：品牌色方塊 + 縮寫文字（不使用官方 Logo 圖檔） */
export default function BrandMark({ brand, size = 'sm', className }: { brand: BrandId; size?: keyof typeof SIZE; className?: string }) {
  const b = BRAND_MAP[brand];
  return (
    <span
      aria-hidden
      className={clsx('grid shrink-0 place-items-center font-black leading-none tracking-tight', SIZE[size], className)}
      style={{ backgroundColor: b.color, color: b.ink }}
    >
      {b.mark}
    </span>
  );
}
