import clsx from 'clsx';
import { LayoutGrid } from 'lucide-react';
import { BRANDS } from '@/lib/brands';
import BrandMark from './BrandMark';

const chip = (active: boolean) =>
  clsx(
    'flex h-11 shrink-0 items-center gap-2 rounded-xl border pl-1.5 pr-3.5 text-sm font-medium transition-colors duration-150',
    active
      ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-stone-500',
  );

const Count = ({ n, active }: { n?: number; active: boolean }) =>
  n == null ? null : (
    <span className={clsx('tabular text-xs', active ? 'opacity-70' : 'text-stone-400 dark:text-stone-500')}>{n}</span>
  );

export default function BrandBar({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (v: string) => void;
  counts: Record<string, number> | null;
}) {
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;
  // 有資料的品牌排前面，沒資料的品牌不顯示，避免點了得到空結果
  const brands = BRANDS.filter((b) => b.id !== 'other' && (!counts || counts[b.id]));

  return (
    <nav aria-label="依品牌篩選" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
      <button type="button" className={chip(value === 'all')} aria-pressed={value === 'all'} onClick={() => onChange('all')}>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          <LayoutGrid className="h-3.5 w-3.5" />
        </span>
        全部
        <Count n={total} active={value === 'all'} />
      </button>
      {brands.map((b) => {
        const active = value === b.id;
        return (
          <button
            key={b.id}
            type="button"
            className={chip(active)}
            aria-pressed={active}
            onClick={() => onChange(active ? 'all' : b.id)}
          >
            <BrandMark brand={b.id} />
            {b.name}
            <Count n={counts?.[b.id]} active={active} />
          </button>
        );
      })}
    </nav>
  );
}
