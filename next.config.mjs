// GitHub Pages 專案網址為 https://<user>.github.io/<repo>/，需要 basePath；
// 由 CI 傳入 NEXT_PUBLIC_BASE_PATH，本機開發維持根目錄
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
