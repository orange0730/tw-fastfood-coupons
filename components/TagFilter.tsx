import clsx from 'clsx';
import { QUICK_TAGS } from '@/lib/brands';

export default function TagFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label="依主題篩選" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
      {QUICK_TAGS.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? '' : t)}
            className={clsx(
              'h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150',
              active
                ? 'bg-red-600 text-white'
                : 'bg-stone-200/60 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700',
            )}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
