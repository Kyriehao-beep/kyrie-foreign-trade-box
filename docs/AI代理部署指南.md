# AI 识别代理部署指南（站长专属）

> 背景：终端用户"不懂 API、不想配置"。因此 AI 改为**站点统一代理**模式——
> 你的 API Key 存在代理服务端（环境变量），前端只保存一个代理地址，用户打开即用。

## 1. 架构

```
用户浏览器                    你的 Cloudflare Worker（代理）            AI 服务商
   │  POST {system,user}  │                                         │
   │ ───────────────────▶ │  fetch chat/completions（带你的 Key）    │
   │  ◀── {content} ─────  │ ──────────────────────────────────────▶ │
   │   （零密钥下发）        │  （Key 仅在此处，存 env）               │
```

- 前端：`src/services/aiClient.ts` POST 到 `endpoint`，解析 `{ content }`
- 代理：`worker/ai-proxy.js`（Cloudflare Worker）
- 密钥：`AI_PROVIDER_KEY` 存于 Worker 环境变量，**永不出现在前端**

## 2. 部署步骤（Cloudflare Workers）

前置：你有一个 Cloudflare 账号（免费额度即可）。

1. 安装 wrangler（需 Node 环境）：
   ```bash
   npm install -g wrangler
   npx wrangler login
   ```
2. 进入项目目录，部署 Worker：
   ```bash
   cd worker
   npx wrangler deploy ai-proxy.js --name ktb-ai-proxy
   # 或直接用仓库内的 wrangler.toml：
   npx wrangler deploy
   ```
3. 配置密钥（**不要写进代码**）：
   ```bash
   npx wrangler secret put AI_PROVIDER_KEY
   # 按提示粘贴你的 Key，例如 DeepSeek / SiliconFlow / OpenAI 的 API Key
   ```
4. 配置非密钥变量（在 `worker/wrangler.toml` 的 `[vars]` 已预置，可按需改）：
   - `AI_PROVIDER_URL`：如 `https://api.deepseek.com/v1`
   - `AI_MODEL`：如 `deepseek-chat`
   - `CORS_ORIGIN`：**务必改成你的前端域名**，例如 `https://kyriehao-beep.github.io`（多个逗号分隔）

   也可在 Cloudflare 控制台「Workers → 你的 ktb-ai-proxy → 设置 → 变量」里改。

5. 拿到 Worker 地址，形如：
   `https://ktb-ai-proxy.<你的子域>.workers.dev`

## 3. 在前端启用

两种方式二选一（优先级：后台设置 > 构建注入）：

- **方式 A（推荐，免重构建）**：以管理员登录站点后台 `/admin` →
  「AI 识别代理设置」→ 填入上面的 Worker 地址 → 保存。
  全站用户立即可用，无需重新部署前端。
- **方式 B（构建注入）**：构建前端时设置环境变量
  `VITE_AI_PROXY_ENDPOINT=https://ktb-ai-proxy.xxx.workers.dev`，再部署。

## 4. 验证

```bash
# 健康检查
curl https://ktb-ai-proxy.xxx.workers.dev/health
# 应返回 {"ok":true}

# 真实识别（把 user 换成你的客户资料）
curl -X POST https://ktb-ai-proxy.xxx.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"system":"你是外贸制单助手，只返回JSON","user":"客户：北辰户外用品有限公司，500个硅胶徽章，FOB深圳"}'
# 应返回 {"content":"{...}"}
```

前端表现：在单据中心粘贴资料 → 点「AI 一键识别并填单」即可自动填单。
若代理未配置，按钮禁用并提示"由站长统一开启"，但「手动方式」（生成提示词发给任意 AI 网页再贴回）仍可用。

## 5. 安全与成本要点

- ✅ Key 只在 Worker 环境变量，前端零密钥，用户无需懂 API
- ✅ `CORS_ORIGIN` 限定你的前端域名，防止代理被他人盗刷
- ✅ 输入校验 + 上游错误映射为友好中文
- 💡 成本：走你自己的低价/免费额度（如 DeepSeek、SiliconFlow 免费额度），由你承担
- 💡 如需更强防护，可在 Cloudflare 控制台给该 Worker 加「速率限制规则」（免费版也支持基础规则）
- ⚠️ 代理是公开端点，若 `CORS_ORIGIN` 不设或设为 `*`，可能被他人调用消耗你的额度，请务必设为你的前端域名
