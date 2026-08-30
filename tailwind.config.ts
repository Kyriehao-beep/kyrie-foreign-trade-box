import type { Config } from 'tailwindcss'

/**
 * 设计令牌集中在这里定义，页面里只允许引用令牌名，不再手写裸值。
 * 视觉方向：专业、克制、可信 —— 深青绿主色 + 暖灰白底，避免玻璃/荧光/大面积渐变。
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 主文字 / 页面底色（低对比暖灰白）
        ink: '#102a2b',
        paper: '#f4f8f6',
        // 品牌：深青绿 → 蓝绿
        brand: {
          50: '#eefaf6',
          100: '#d7f2e8',
          200: '#b3e6d5',
          300: '#84d3bd',
          400: '#4fb799',
          500: '#16876c',
          600: '#0f6e59',
          700: '#0d594a',
          800: '#0f4a3f',
          900: '#123d36',
        },
        ocean: '#247aa7',
        // 语义化边框 / 表面色，统一各处描边深浅
        line: {
          DEFAULT: '#e2e8e5',
          strong: '#cbd8d3',
        },
      },
      borderRadius: {
        field: '0.75rem', // 输入框、小控件 12px
        card: '1rem', // 卡片 16px
        panel: '1.25rem', // 大面板 / 弹层 20px
      },
      boxShadow: {
        // 静态卡片：极轻，只用来把白卡从暖灰底上托起来
        card: '0 1px 2px rgba(16, 42, 43, 0.04), 0 1px 3px rgba(16, 42, 43, 0.03)',
        // 悬浮态：hover 时从 card 升级到 lift
        soft: '0 4px 16px rgba(16, 42, 43, 0.06)',
        lift: '0 10px 28px rgba(16, 42, 43, 0.10)',
        // 弹层 / 下拉
        pop: '0 18px 44px rgba(16, 42, 43, 0.16)',
      },
      transitionDuration: {
        // 只允许 150 / 200 / 250 三档
        fast: '150ms',
        base: '200ms',
        slow: '250ms',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      spacing: {
        // 区块垂直节奏（首页/营销页）
        section: '4.5rem', // 72px
        'section-lg': '6rem', // 96px
      },
      maxWidth: {
        shell: '80rem', // 1280px
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config
