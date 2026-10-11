'use client';

import { useEffect, useState } from 'react';
import { Moon, Search, Sun, X } from 'lucide-react';

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-red-600" />
      {/* 票券輪廓 */}
      <path
        d="M8 10.5A1.5 1.5 0 0 1 9.5 9h13a1.5 1.5 0 0 1 1.5 1.5v2.75a2.75 2.75 0 0 0 0 5.5v2.75a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 8 21.5v-2.75a2.75 2.75 0 0 0 0-5.5z"
        fill="#fff"
      />
      <path d="M18.5 11.5v9" stroke="#DC2626" strokeWidth="1.4" strokeDasharray="1.6 1.6" />
      <path d="M12.2 18.2l3.6-4.4" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12.4" cy="14.1" r="1" fill="#DC2626" />
      <circle cx="15.6" cy="17.9" r="1" fill="#DC2626" />
    </svg>
  );
}

export default function Header({ query, onQuery }: { query: string; onQuery: (v: string) => void }) {
  const [dark, setDark] = useState(false);

  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {}
  };

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/85 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6">
        <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="速食優惠情報站 首頁">
          <Logo />
          <span className="hidden leading-tight sm:block">
            <span className="block text-[15px] font-black tracking-tight">速食優惠情報站</span>
            <span className="block text-[11px] font-medium text-stone-500 dark:text-stone-400">官方優惠 · 每日更新</span>
          </span>
        </a>

        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="搜尋餐點、優惠碼，例如：蛋撻、買一送一"
            aria-label="搜尋優惠"
            className="h-11 w-full rounded-xl border border-stone-200 bg-stone-100/70 pl-10 pr-10 text-[15px] placeholder:text-stone-400 transition-colors focus:border-red-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-500/10 dark:border-stone-700 dark:bg-stone-800/70 dark:focus:bg-stone-900 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery('')}
              aria-label="清除搜尋"
              className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={dark ? '切換為淺色模式' : '切換為深色模式'}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}
