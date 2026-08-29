# UI / 信息架构 / 交互升级说明（第二阶段）

> 范围：仅 UI、信息架构、交互升级；业务计算、localStorage、PDF / Excel 导出**保持兼容不变**。
> 设计方向：专业、克制、可信；深青绿 + 蓝绿色；暖灰白底；卡片圆角/阴影/边框/间距统一为设计令牌；避免玻璃、荧光渐变、无意义动画。

## 一、营销页 / 工作台 两套布局
- 新增 `src/components/layout/MarketingLayout.tsx`：轻量顶部导航（首页/工具/会员方案/关于&定制/联系站长 + CTA「免费开始使用」），移动端汉堡抽屉。**无世界时间条**。营销页：首页 `/`、关于 `/about`、联系 `/contact`、会员 `/membership`、账户流 `/auth` `/checkout` `/unlock`。
- 新增 `src/components/layout/WorkbenchLayout.tsx`：可折叠侧栏 + 世界时间条 + 移动底栏。工作台页：单据 `/documents`、跟单 `/follow-up`、报价 `/quote`、汇率 `/exchange`、世界时间 `/world`、管理 `/admin`。
- `src/App.tsx` 用嵌套路由把页面套进对应布局壳，世界时间条从全局移除、改由 WorkbenchLayout 承载（仅工作台显示）。

## 二、可折叠侧栏（桌面收起为图标）
- `src/components/Sidebar.tsx` 重构：桌面 `w-64` ↔ `w-[76px]` 收起切换（chevron 按钮），收起态只剩图标 + `title`/`aria-label` 提示；移动端仍为抽屉。分组：工作台/业务(单据中心·跟单助手)/工具箱(报价·汇率·世界时间)/账户(会员·联系·关于)/站长专用(管理后台)。

## 三、手机端底部导航
- 新增 `src/components/BottomNav.tsx`：固定底栏 `首页 / 单据 / 跟单 / 工具 / 更多`；「更多」展开抽屉含汇率、世界时间、会员、联系、关于、管理后台。仅 `<lg` 显示，主内容 `pb-20` 防遮挡。

## 四、首页重设计（六个区块）
- `src/pages/HomePage.tsx` 重写：① Hero（标题「报价不亏、单据不错、客户不漏跟」+「Kyrie的外贸盒子，把外贸业务里最重复的工作，变成打开即用的小工具。」+ 主按钮「免费开始使用」+ 次按钮「看看能解决什么问题」）② 可交互工作台演示（报价/单据/跟单 三 Tab 切换）③ 三个核心痛点 ④ 三个核心工具 ⑤ 会员方案 ⑥ 私人定制 CTA。
- 删除：原完整六类单据网格、完整工具矩阵、暗色特性长介绍、定制服务长介绍。价格统一取自 `staticConfig.PRICING_SUMMARY`，无硬编码违禁文案。

## 五、单据中心升级（`src/features/documents/DocumentWorkspace.tsx`）
- 左右分栏 + 实时预览保留；手机端「填写资料 / 预览单据」切换保留。
- 48 个字段拆为 **6 个可折叠区域**：基本信息（含 Logo）、买卖方资料、产品明细、贸易条款、收款与清关资料、备注与合同条款。
- 顶部完成度提示「**已完成 X/6 个区域**」+ 每区「已填 m/n」或「已完成」徽标。
- 快捷操作：最近单据（按更新时间下拉切换）、复制当前单据（编号加「副本」）、从 PI 生成 CI·PL（共享买方/产品/贸易/收款字段，仅 PI 可点）。
- 自动保存状态改为「**已保存 · HH:MM**」（不再长期显示「正在保存…」）。
- 清除草稿：二次确认条（确认清除 / 取消）+ 清除后底部「撤销」提示（约 6 秒）。
- 字段补 `name`/`label`/`review` 提示；删除类按钮均带 `aria-label`。

## 六、交互与可访问性
- 卡片 hover 仅 `translate-y -0.5 + border-brand-200 + shadow-lift`，用 `transition-[transform,box-shadow,border-color] duration-fast`，**全仓已无 `transition-all`**。
- 设计令牌（圆角 `field/card/panel`、阴影 `card/soft/lift/pop`、时长 `fast/base/slow`、间距 `section`）已在 `tailwind.config.ts`，组件只引用令牌。
- `prefers-reduced-motion` 已在 `src/index.css` 全局降级；`Button` 组件含 `focus-visible:ring-2`；图标按钮补 `aria-label`；金额/数量用 `.num`（`tabular-nums`）。

## 七、验证
- `tsc -b` 干净；单元测试 **141/141 通过**（含 `App.test.tsx` 改为校验营销导航、`DocumentWorkspace.test.tsx` 文案对齐）。
- 生产构建通过；`puppeteer` 四档断点（1440 / 1024 / 768 / 390）检查 **32/32 通过**：无横向滚动、无控制台报错、侧栏/底栏/世界时间条可见性符合预期。

## 注意 / 后续
- 定制落地页 `public/landing.html` 仍属遗留、未接入 `staticConfig`（见 MEMORY），本次未动。
- 主题切换（亮/暗）仍在待办，本阶段仅做亮色令牌统一。
