import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: '隱私權政策｜速食優惠情報站',
  description: '速食優惠情報站如何使用 Cookie 與第三方廣告服務。',
};

const UPDATED = '2026-10-11';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-100">
        <ArrowLeft className="h-4 w-4" />
        回到優惠列表
      </Link>

      <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">隱私權政策</h1>
      <p className="mt-1 text-sm text-stone-500 tabular">最後更新：{UPDATED}</p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300 [&_a]:font-medium [&_a]:text-red-600 [&_a:hover]:underline dark:[&_a]:text-red-400 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-stone-900 dark:[&_h2]:text-stone-100 [&_li]:ml-5 [&_li]:list-disc">
        <section>
          <h2>本站蒐集的資料</h2>
          <p>
            本站不需要註冊，也不會要求你提供姓名、電話、電子郵件等個人資料。搜尋與篩選都在你的瀏覽器中進行，不會傳送到本站伺服器。
          </p>
          <p className="mt-2">
            我們只會在你的瀏覽器儲存「深色 / 淺色模式」偏好（localStorage），用來記住你的顯示設定，不包含任何可識別個人的資訊。
          </p>
        </section>

        <section>
          <h2>廣告與 Cookie</h2>
          <p>本站使用 Google AdSense 顯示廣告，以維持網站營運：</p>
          <ul className="mt-2 space-y-1">
            <li>Google 等第三方供應商會使用 Cookie，依據你先前造訪本站或其他網站的紀錄放送廣告。</li>
            <li>Google 使用廣告 Cookie，讓 Google 及其合作夥伴能根據你造訪本站和／或網際網路上其他網站的情況，向你放送廣告。</li>
            <li>
              你可以前往 <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">Google 我的廣告中心</a>{' '}
              停用個人化廣告，或前往 <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info</a>{' '}
              停用第三方供應商的個人化廣告 Cookie。
            </li>
            <li>
              Google 如何使用這些資料，請參閱{' '}
              <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
                Google 如何使用合作夥伴網站或應用程式的資訊
              </a>
              。
            </li>
          </ul>
        </section>

        <section>
          <h2>外部連結</h2>
          <p>
            優惠卡片上的「前往點餐」與「官方活動頁」會開啟各品牌官方網站。這些網站有各自的隱私權政策，本站無法控制其蒐集資料的方式。
          </p>
        </section>

        <section>
          <h2>聯絡我們</h2>
          <p>
            對本政策或網站內容有任何疑問，請至{' '}
            <a href="https://github.com/orange0730/tw-fastfood-coupons/issues" target="_blank" rel="noopener noreferrer">
              GitHub Issues
            </a>{' '}
            與我們聯繫。
          </p>
        </section>
      </div>
    </main>
  );
}
