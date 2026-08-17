# EdgeOne Makers 上线手册

## 一、部署前检查

```bash
pnpm install --frozen-lockfile
pnpm test:all
pnpm build:edgeone
```

`dist/edgeone` 必须同时包含 `index.html`、`cloud-functions/api/[[default]].js`、`package.json` 和 `edgeone.json`。

如需在部署前验证真实函数路由，可安装官方命令行工具后运行：

```bash
npm install -g edgeone@latest
edgeone makers dev
```

项目固定使用 EdgeOne 预装的 Node.js 20.18.0。

## 二、连接 GitHub

1. 在 EdgeOne Makers 新建项目并导入 GitHub 仓库。
2. 确认安装命令为 `pnpm install --frozen-lockfile`。
3. 确认构建命令为 `pnpm run build:edgeone`。
4. 确认输出目录为 `dist/edgeone`。
5. 使用 EdgeOne 免费默认网址，前期不购买域名。

## 三、创建三个管理员

在项目环境变量中配置 `.env.example` 列出的九个变量。每个密码建议使用独立的 16 位以上随机字符串，不得与其他网站复用。

首次请求会自动创建未存在的管理员。首次登录后系统会要求更换临时密码，初始密码 7 天后失效；人工重置给用户的临时密码 24 小时后失效。环境变量中的初始密码在完成换密码后应删除或换成无法登录的随机值，避免新环境重新使用。

## 四、配置收款码

1. 管理员登录 `/admin`。
2. 分别上传微信收款码和支付宝收款码。
3. 图片限 2MB 以内 PNG、JPG 或 WebP。
4. 两种收款码均配置后，普通用户才能创建订单。

## 五、上线验收

1. 无痕窗口注册普通账号，确认服务器返回 72 小时试用。
2. 创建 59 元月度订单，不实际转账时不得点击“确认到账”。
3. 在测试环境用管理员手工开通月度权益，确认用户获得 30 天。
4. 检查 499 元和 1299 元显示金额，不发起真实付款。
5. 使用中国大陆普通网络、不开 VPN，无痕访问首页、注册、登录、试用权限、深层路由和导出。
6. 检查移动端导航、支付页、管理页以及浏览器控制台。
7. 检查 `/api/auth/login`、`/api/auth/register`、`/api/auth/password`、订单接口和管理员写接口的 EdgeOne 边缘限频规则。

## 六、日常人工收款流程

1. 用户选择方案，扫码付款，填写付款人姓名或备注。
2. 管理员在微信或支付宝账单中核对金额和付款人。
3. 只有确认实际到账后才点击“确认到账并开通”。
4. 金额或付款人无法匹配时，填写原因并拒绝申请。
5. 定期检查审计记录，不共享管理员账号。

## 七、EdgeOne 外层限频建议

- `/api/auth/login`：每个 IP 每分钟最多 30 次。
- `/api/auth/register`：每个 IP 每小时最多 20 次。
- `/api/auth/password`：每个 IP 每小时最多 60 次。
- `/api/orders*`：每个 IP 每小时最多 120 次。
- `/api/admin/*`：每个 IP 每小时最多 300 次，并只允许 HTTPS。

应用内仍保留更严格的账号/IP 限频作为第二道防线。边缘限频用于降低恶意请求带来的函数和 Blob 成本。
