# AI 识别代理 · EdgeOne 同域部署（国内可达）

> 旧方案 `docs/AI代理上线步骤.md`（Cloudflare Workers）已停用，原因见下。

## 背景与根因

原 AI 代理部署在 Cloudflare Workers（`*.workers.dev`）。经实测：

- `api.deepseek.com` 国内可达（HTTP 401，仅因无 key，正常）；
- `*.workers.dev` 整个域名在国内被 GFW 干扰，直连超时。

**DeepSeek 本身是国产、国内可达，问题出在「浏览器 → 代理(workers.dev)」这一跳被墙。** 所以必须把代理搬到国内可达的地方。

## 新方案：EdgeOne Pages Edge Function（同域）

把 AI 代理改写为 **EdgeOne Edge Function**，与站点同域（`/api/ai-proxy`）：

| 项 | 说明 |
|----|------|
| 函数源码 | `edge-functions/api/ai-proxy.js` |
| 构建产物 | `dist/edgeone/edge-functions/api/ai-proxy.js`（由 `scripts/prepare-edgeone.mjs` 拷贝） |
| 前端默认 endpoint | `/api/ai-proxy`（`src/services/aiSettings.ts` 的 `readEnvEndpoint()` 兜底） |
| 旧地址迁移 | `getAiEndpoint()` 自动把残留的 `*.workers.dev` 地址回退到同域默认 |
| 密钥 | 存 EdgeOne 环境变量，前端零密钥（同原「站长持有 key」模型） |

路由：EdgeOne 规则「函数路由优先于静态资源/重写」，故 SPA 的 `/* → /index.html` 不会吞掉 `/api/ai-proxy`。

## 部署步骤

1. 构建：`pnpm run build:edgeone`（会执行 tsc + vite + 拷贝 cloud/edge-functions + 布局测试）。
2. 部署：用 EdgeOne Makers 连接器部署 `dist/edgeone`，**`projectType: fullstack`**（务必 fullstack，否则函数不会被挂载），项目名 `kyrie-trade-box`。
3. **站长配置密钥（必做，否则函数返回「未配置」）**：
   - 入口：EdgeOne Pages 控制台 → 项目 `kyrie-trade-box` → 设置 → 环境变量（或函数配置）
   - 添加：
     - `AI_PROVIDER_KEY` = 你的 DeepSeek API Key（`sk-...`）
     - `AI_PROVIDER_URL` = `https://api.deepseek.com/v1`
     - `AI_MODEL` = `deepseek-chat`
   - 保存后**建议重新触发一次部署**使其生效。
4. 浏览器打开预览链接，进入任一单据页的「AI 一键识别」测试；后台 `/admin` 的「AI 识别代理设置」已显示同域默认值。

## 已知限制

- **预览链接过期**：EdgeOne Makers 预览 URL 带 `eo_token`，约 3 小时过期；过期需重新生成/分享链接。绑定自定义域名后可永久访问、且免 SSO。
- **免费额度**：函数有免费额度，超量可能限速/计费，留意控制台用量。
- **环境变量**：免费版支持函数环境变量；若控制台找不到入口，可在 `edgeone.json` 或函数配置中确认，或用 `edgeone pages env add` CLI。

## 回滚

若需临时切回旧代理：后台 `/admin` 手动填写 `https://ktb-ai-proxy.kyriehao.workers.dev` 并保存（仅当你已在境外网络/代理可用时有效，国内不推荐）。
