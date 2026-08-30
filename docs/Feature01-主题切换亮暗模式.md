# Feature ①：主题切换（亮 / 暗模式）

## 概述

为全站添加亮色 / 暗色主题切换，用户可手动切换或首次访问跟随系统偏好。暗色模式下所有页面、组件、表单、侧栏统一呈现深色表面 + 浅色文字，品牌绿色保持不变。

## 技术方案

### 核心机制：`darkMode: 'class'` + `.dark` 作用域 CSS 覆盖层

| 层 | 文件 | 职责 |
|---|---|---|
| Tailwind 配置 | `tailwind.config.ts` | 添加 `darkMode: 'class'` |
| 防闪烁内联脚本 | `index.html` `<head>` | 在首屏绘制前同步读取 localStorage / 系统偏好，设置 `<html class="dark">` |
| 主题状态管理 | `src/features/theme/theme.ts` | localStorage 持久化 (`ktb_theme`) + 系统跟随 + React `useTheme()` hook |
| 切换按钮 | `src/features/theme/ThemeToggle.tsx` | Sun/Moon 图标按钮，aria-label 中文，自身样式由覆盖层自动适配 |
| 颜色覆盖层 | `src/features/theme/dark.css`（**自动生成**） | 56 条 `.dark .<token>` 规则，高优先级覆盖 Tailwind 中性/品牌色工具类 |
| 生成脚本 | `scripts/gen-dark-css.mjs` | 扫描 `src/**/*.{ts,tsx}` 全部颜色 token（含 hover:/focus-visible:/placeholder: 变体和 /透明度），按角色映射到暗色值 |
| 渐变修复 | `QuoteAssistant.tsx` | 唯一 `from-brand-50 to-white` 渐变添加 `dark:from-[#0f3a31] dark:to-[#15231f]` |
| 布局集成 | `MarketingLayout.tsx` | 头部导航栏添加 ThemeToggle（桌面+移动）；移动抽屉也添加 |
| 布局集成 | `Sidebar.tsx` | 桌面侧栏底部（展开时与提示文字同行，收起时居中）+ 移动抽屉底部 |

### 为什么用生成式覆盖层而非逐个加 `dark:` 变体？

代码库有 **270+ 处硬编码中性色**（`bg-white`、`text-slate-600`、`border-slate-200` 等）。逐一手写 `dark:` 变体：
- 改动量巨大（270+ 处），回归风险高
- 容易遗漏 hover/focus 等变体组合
- 后续新增组件必须记得加 `dark:`，容易遗忘

生成式方案的优势：
- **零组件改动**：56 条 CSS 规则自动覆盖全部 270+ 用法（含变体）
- **可重现**：改色板只需改生成脚本重跑
- **安全回退**：删除 `dark.css` import 即完全恢复亮色

### 暗色色板设计原则

| 角色 | 亮色 → 暗色映射示例 | 对比度目标 |
|---|---|---|
| 页面底色 (`bg-paper`) | `#f4f8f6` → `#0c1614` | — |
| 卡片/面板 (`bg-white`) | `#fff` → `#15231f` | 表面层级清晰 |
| 主文字 (`text-ink`) | `#102a2b` → `#e9f1ee` | ≥7:1 |
| 正文 (`text-slate-600`) | `#475569` → `#aebdb8` | ≥4.5:1 |
| 辅助文字 (`text-slate-400`) | `#94a3b8` → `#8b9a95` | ≥3:1 (小字) |
| 边框 (`border-slate-200`) | `#e2e8e0` → `#2c3e39` | 可见但不抢眼 |
| 品牌高亮 (`bg-brand-50`) | `#eefaf6` → `#0f3a31` | 深青绿，不刺眼 |
| 品牌强调 (`text-brand-700`) | `#0d594a` → `#7fe0c4` | 亮青绿，在暗面上清晰 |
| 管理员标记 (`bg-amber-50`) | `#fffbeb` → `#3a2e0c` | 深琥珀，低频使用 |

### 排除项（不做暗色转换）

- `text-white`：白色文字（按钮/徽章上）保持白色
- `bg-white/10`、`/15`、`/25`、`/60`：彩色背景上的白色叠层保留（如世界时间条芯片）
- `print:bg-*`：打印样式强制浅色
- 语义色（red/emerald/rose/green/blue）：保持原样，暗色下对比足够
- `ring-brand-*`：品牌环在暗面上可见，不改

## 验证结果

| 检查项 | 结果 |
|---|---|
| TypeScript 编译 | ✅ 无错误 |
| 单元测试 | ✅ 141 passed (22 files) |
| Vite 构建 | ✅ 成功（含 dark.css 46KB CSS 包） |
| 水平溢出 1440/1024/768/390 | ✅ 全部 0px |
| 暗色预应用（防闪烁） | ✅ bodyBg = `rgb(12,22,20)` |
| 头部暗色 | ✅ headerBg = `rgba(21,35,31,0.9)` |
| 切换按钮：暗→亮→暗 | ✅ 类名翻转 + localStorage 持久 |
| 工作台路由暗色 | ✅ html.dark = true |
| 控制台错误 | ✅ 0 条 |
| 视觉截图确认 | ✅ 首页/工作台暗色对比度良好，品牌绿不变 |

## 使用方式

- **用户操作**：点击头部/侧栏的 🌙/☀️ 图标按钮切换
- **持久化**：选择存入 `localStorage('ktb_theme')`，刷新/跨页保留
- **系统跟随**：未手动选择时，自动跟随 `prefers-color-scheme`
- **FOUC 防护**：`index.html` 内联脚本在 `<head>` 同步设置类，无闪烁

## 后续扩展

如需调整暗色色板，修改 `scripts/gen-dark-css.mjs` 中的映射表后重跑：
```bash
node scripts/gen-dark-css.mjs
```

如需支持更多语义色（如 status red/blue 在暗色下的微调），在生成脚本的 `resolve()` 函数中添加即可。
