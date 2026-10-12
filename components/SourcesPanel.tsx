import { CircleAlert, CircleCheck, ExternalLink } from 'lucide-react';
import type { CrawlMeta } from '@/types/coupon';
import BrandMark from './BrandMark';

/** 固定 UTC+8 格式化（不用 Intl，避免 Node / 瀏覽器 ICU 差異造成 hydration mismatch） */
export function fmtTaipei(iso: string | null | undefined) {
  if (!iso) return '—';
  const t = new Date(Date.parse(iso) + 8 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCMonth() + 1}/${t.getUTCDate()} ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}

/** 列出每個官方來源與最近一次抓取狀態，讓使用者自行查證 */
export default function SourcesPanel({ meta }: { meta: CrawlMeta | null }) {
  if (!meta) return null;
  return (
    <section aria-labelledby="sources-title" className="mt-12">
      <h2 id="sources-title" className="text-lg font-black tracking-tight">
        資料來源
      </h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        所有優惠都直接取自品牌官網，每日自動檢查一次。點來源名稱可到官網查證。最後檢查：
        <span className="tabular">{fmtTaipei(meta.checkedAt)}</span>
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {meta.sources.map((s) => (
          <li
            key={s.brand}
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
          >
            <BrandMark brand={s.brand} size="md" />
            <div className="min-w-0 flex-1">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold text-stone-800 hover:text-red-600 hover:underline dark:text-stone-100 dark:hover:text-red-400"
              >
                <span className="truncate">{s.label}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              {s.ok ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                  <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
                  正常 · <span className="tabular">{s.count}</span> 則
                </p>
              ) : (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                  <CircleAlert className="h-3.5 w-3.5" />
                  今日無法連線，顯示 <span className="tabular">{fmtTaipei(s.lastSuccess)}</span> 的資料
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-stone-400">Subway 台灣官網目前沒有公開優惠資訊，因此暫不收錄。</p>
    </section>
  );
}
