import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', '"PingFang TC"', '"Microsoft JhengHei"', ...defaultTheme.fontFamily.sans],
      },
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translate(-50%, 8px) scale(.98)' },
          to: { opacity: '1', transform: 'translate(-50%, 0) scale(1)' },
        },
      },
      animation: { 'toast-in': 'toast-in .2s ease-out' },
    },
  },
  plugins: [],
};
export default config;
