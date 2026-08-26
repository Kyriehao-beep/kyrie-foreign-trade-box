# AI 一键识别 —— 上线步骤（站长执行）

> 适用：已注册 Cloudflare 免费账号；想用国内/免费额度 LLM（默认 DeepSeek）。
> 目标：把密钥存在 Cloudflare 代理 Worker，前端零密钥、打开即用。
> 前置：本地已装 Node（macOS 用户 `~/.workbuddy/binaries/node` 或系统 node 均可）。

---

## 总览（4 步）
1. 装 wrangler 并登录 Cloudflare
2. 部署 AI 代理 Worker（`ktb-ai-proxy`）
3. 把你的 LLM Key 写进 Worker 密钥
4. 在站点 `/admin` 填 Worker 地址，启用 AI

---

## 步骤 1：安装 wrangler + 登录
打开终端：
```bash
npm i -g wrangler
npx wrangler login
```
`login` 会自动打开浏览器，用你刚注册的 Cloudflare 账号授权即可。
> 若浏览器没弹窗，按终端提示复制链接到浏览器手动授权。

## 步骤 2：部署 AI 代理 Worker
```bash
cd /Users/haozhisheng/Desktop/Kyrie的外贸盒子2/worker
npx wrangler deploy
```
> 注意：必须 `cd` 进 `worker/` 目录后再部署。不要从项目根目录跑 `npx wrangler deploy`，否则 wrangler 会把根目录的 Vite 前端项目误当成要部署的 Worker，卡在 "Vite version must be >= 6.0.0" 的报错。`worker/wrangler.toml` 里的 `main = "ai-proxy.js"` 是相对于 `worker/` 目录解析的。
成功后会输出类似：
```
https://ktb-ai-proxy.<你的子域>.workers.dev
```
**记下这个地址**（`<你的子域>` 是 Cloudflare 自动分配的，通常是你的账号名）。
> `AI_PROVIDER_URL` / `AI_MODEL` / `CORS_ORIGIN` 已在 `worker/wrangler.toml` 预置为 DeepSeek + 你的 GitHub Pages 域名，一般不用改。

## 步骤 3：配置 LLM Key
```bash
cd /Users/haozhisheng/Desktop/Kyrie的外贸盒子2/worker
npx wrangler secret put AI_PROVIDER_KEY
```
终端提示输入时，粘贴你的 **DeepSeek API Key**（去 https://platform.deepseek.com 申请，有免费额度）。
> Key 只存在 Cloudflare 服务端，绝不下发前端，源码里也看不到。

## 步骤 4：在站点启用 AI
1. 浏览器打开线上站点：`https://kyriehao-beep.github.io/kyrie-foreign-trade-box/`
2. 访问 `/admin`（默认口令 `wiz1` / `wiz2` / `wiz3`，任一即可）
3. 找到「AI 识别代理设置」，粘贴步骤 2 的地址：
   `https://ktb-ai-proxy.<你的子域>.workers.dev`
4. 保存 → 全站「AI 粘贴识别」按钮即启用，**无需重构建前端**。

## 验证
在任意单据页（报价单/PI/发票等）点「AI 粘贴识别」，粘贴一段客户询盘文本，应自动提取并填表。
也可直接测代理是否在线：浏览器访问 `https://ktb-ai-proxy.<你的子域>.workers.dev/health`，返回 `{"ok":true}` 即正常。

---

## 换 LLM 提供方（可选）
改 `worker/wrangler.toml` 的 `[vars]`，然后重新 `npx wrangler deploy`，再 `wrangler secret put AI_PROVIDER_KEY` 换成对应家的 Key：

| 提供方 | AI_PROVIDER_URL | AI_MODEL | 备注 |
|---|---|---|---|
| DeepSeek（默认） | `https://api.deepseek.com/v1` | `deepseek-chat` | 国产，有免费额度 |
| SiliconFlow 硅基流动 | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` | 国产，多模型 |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | 需自备 Key |

---

## 故障排查
| 现象 | 原因 / 处理 |
|---|---|
| 部署报权限/未授权 | 没 `login` 或登录失效 → 重跑 `npx wrangler login` |
| 前端 AI 报 CORS / 网络错误 | 检查 `worker/wrangler.toml` 的 `CORS_ORIGIN` 是否等于 `https://kyriehao-beep.github.io`（当前已对） |
| AI 报 401 | Key 配错或未配 → 重跑 `wrangler secret put AI_PROVIDER_KEY` |
| AI 报 500「缺少配置」 | `AI_PROVIDER_KEY` 没 put 成功 → 重跑步骤 3 |
| `/health` 返回 ok 但识别失败 | 上游 Key 额度用尽或模型名错 → 核对提供方配置 |

---

## 安全提示
- 代理地址建议只让你自己知道；`CORS_ORIGIN` 已限制只有你的前端域名能调用，他人无法直接盗用。
- 若担心代理泄露，可在 Cloudflare 控制台给 Worker 加一层自定义头校验（进阶，需要时再做）。
