# Kyrie的外贸盒子

面向中国外贸业务员、SOHO 卖家和中小企业的本地优先制单与效率工具。

## 本地运行

```bash
pnpm install
pnpm dev
```

完整验证：

```bash
pnpm test:all
pnpm build
pnpm build:edgeone
```

## 技术栈

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui 风格组件 + Radix UI
- React Router
- EdgeOne Makers Cloud Functions + Pages Blob
- Vitest + Testing Library + Node.js Test Runner
- ExcelJS、jsPDF 与 html2canvas

## 已实现

- 首页、外贸单据中心、贸商工具箱、会员中心、登录注册和管理后台。
- 报价单、形式发票、销售合同、商业发票、装箱单、报关信息六类单据。
- 中文、英文、双语预览，本地草稿和买卖方资料模板。
- 六类单据 PDF 与 Excel 导出。
- AI 粘贴识别区域、加载状态、确定性示例解析与人工核对标记。
- 20 个外贸城市世界时间和工作时间判断。
- 在线汇率与带日期的离线参考汇率回退。
- 服务器账号、HttpOnly 会话、72 小时试用、到期付费墙。
- 月度 29 元 / 30 天、年度 199 元 / 365 天、永久买断 599 元。
- 微信或支付宝扫码后提交付款核对，管理员人工开通会员。
- 最多三个环境变量邀请制管理员，支持收款码上传、订单审核、账号停用、密码重置、手工开通与审计记录。

## 数据边界

- 单据草稿、客户资料、产品明细与导出文件留在用户浏览器与设备中。
- 账号、密码哈希、会话、试用日期、会员权益、付款申请和审计记录保存在 EdgeOne Pages Blob。
- 收款码保存在同一 Blob 命名空间，只有已登录用户可通过接口读取。

## 仍然简化 / 未实现

- 付款为人工核对，尚未接入微信支付或支付宝商户 API 和异步回调。
- 忘记密码由管理员人工重置，尚未接入短信或邮件。
- AI 填单目前为模拟解析；真实 LLM 调用需要服务端代理、密钥保护、用户明确授权和数据处理规则。
- PDF 与 Excel 已在前端生成；印刷级 PDF 字体嵌入、数字签章或服务器归档需要额外库或后端服务。
- 汇率接口失败时使用明确标记日期的静态参考表。

部署和首次上线步骤见 [`docs/deployment/edgeone-launch-runbook.md`](docs/deployment/edgeone-launch-runbook.md)。
