import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Noto_Sans_TC } from 'next/font/google';
import { ADSENSE_CLIENT, adsEnabled } from '@/lib/ads';
import './globals.css';

const noto = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: '速食優惠情報站｜肯德基、必勝客、達美樂優惠碼每日更新',
  description: '彙整肯德基、必勝客、達美樂、摩斯、漢堡王、頂呱呱等台灣速食官方優惠與優惠代碼，一鍵複製、直接前往官方點餐頁，每日自動更新。',
  // AdSense 網站驗證
  ...(adsEnabled ? { other: { 'google-adsense-account': ADSENSE_CLIENT } } : {}),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
  ],
};

// 在 hydration 前套用主題，避免閃白
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW" className={noto.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        {children}
        {adsEnabled && (
          // afterInteractive：不阻塞首屏；各廣告版位在掛載時 push
          <Script
            id="adsbygoogle-init"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
