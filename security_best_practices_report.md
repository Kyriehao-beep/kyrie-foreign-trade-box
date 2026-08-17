# 安全最佳实践审查报告

## 执行摘要

本次审查覆盖 React/TypeScript 前端、EdgeOne Node.js Cloud Functions、会话与权限、人工付款流程、收款码上传、依赖与 EdgeOne 安全头配置。当前源码审查未发现未修复的严重或高危问题。

审查期间发现的 React Router 已知开放重定向 / XSS 漏洞已通过升级修复。EdgeOne Blob 条件写冲突、临时密码绕过、停用账号会话竞争、订单内部备注泄露、并发重复下单和人工开通重复计时等问题也已修复。最终生产依赖审计结果以发布前命令输出为准。

## 已修复问题

### SBP-001：React Router 公开漏洞

- 级别：中危（已修复）
- 位置：`package.json:29`
- 证据：原版本位于 npm 安全公告指定的受影响范围；已升级至 `react-router-dom ^7.18.2`。
- 影响：受影响版本存在开放重定向、XSS 和构造函数注入公开漏洞。
- 修复：升级到官方已修复版本，并重新运行类型检查、前端测试和生产依赖审计。

### SBP-002：临时管理员密码只在前端限制

- 级别：高危（已修复）
- 位置：`cloud-functions/_lib/api.js:18-28`
- 证据：`requireUser` 在放行任何受保护 API 前检查 `passwordResetRequired`，`requireAdmin` 在此基础上再检查管理员角色。
- 影响：如果只隐藏前端管理页，攻击者仍可以直接请求管理 API。
- 修复：服务端统一返回 `PASSWORD_CHANGE_REQUIRED`，换密码前无法读取收款码、创建订单或调用管理员 API。

### SBP-003：EdgeOne 条件写冲突码不一致

- 级别：高危（已修复）
- 位置：`cloud-functions/_lib/blobRepository.js`
- 修复：把真实 SDK 的 `PRECONDITION_FAILED` 统一映射为领域错误 `ALREADY_EXISTS`，并使用 SDK 错误类增加契约回归测试。

### SBP-004：临时密码与停用账号绕过

- 级别：高危（已修复）
- 位置：`cloud-functions/_lib/authService.js`、`cloud-functions/_lib/api.js`
- 修复：拒绝把新密码设置为原密码；人工重置使用高熵随机密码并在 24 小时后失效；管理员初始密码 7 天失效；统一鉴权层始终拒绝停用账号。

### SBP-005：用户订单返回内部字段

- 级别：中危（已修复）
- 位置：`cloud-functions/_lib/billingService.js`
- 修复：普通用户只接收公开订单 DTO；`adminNote`、`reviewedBy` 不再返回，拒绝原因改为独立的用户可见字段。

## 当前防护措施

- 密码使用随机盐 `scrypt` 哈希：`cloud-functions/_lib/security.js:8-26`。
- 会话令牌使用 32 字节安全随机数，服务端只保存 SHA-256 摘要：`cloud-functions/_lib/security.js:29-35`。
- Cookie 设置 `HttpOnly; Secure; SameSite=Lax`：`cloud-functions/_lib/security.js:46-51`。
- 所有非 GET/HEAD 请求必须通过精确同源 `Origin` 校验：`cloud-functions/_lib/api.js:71`。
- 所有管理操作都在服务端再次校验角色：`cloud-functions/_lib/api.js:25-29`。
- 订单金额仅由服务端方案表生成，不采信前端金额。
- 订单确认使用条件写入防止重复开通，订单状态或审计写入中断时可以幂等重试恢复。
- 同一用户和方案并发建单使用条件写入选出唯一订单；人工开通要求幂等键，重试不会重复延长。
- 确认与拒绝必须共同竞争唯一订单裁决事件，多管理员并发操作只有一个结果可生效。
- 登录只累计失败次数；注册、修改密码、订单创建、付款申报和管理员写操作均有限频。
- 已确认权益按用户前缀读取；老版全局事件仅扫描并迁移一次，后续不再为单个用户扫描全站订单。
- 收款码只允许管理员上传 2MB 以内的 PNG/JPEG/WebP：`cloud-functions/_lib/adminService.js:169-190`。
- 前端不保存会话令牌或会员权限到 Web Storage：`src/features/membership/membershipApi.ts:9-25`。
- EdgeOne 配置了 CSP、禁止嵌入、`nosniff`、引用策略和权限策略：`edgeone.json:15-24`。

## 低风险与上线后验证

### SBP-006：平台运行时防护尚需公网验证

- 级别：低
- 位置：`edgeone.json:15-24`
- 证据：仓库已声明安全头，但尚未有 EdgeOne 公网响应头证据。
- 影响：如果平台未应用配置，CSP 和点击劫持防护不会生效。
- 修复：部署后对默认公网网址执行响应头、会话 Cookie、深层路由与无 VPN 访问检查。
- 缓解：上线手册已把此项列为必须验收项。

### SBP-007：应用层限流不代替平台 WAF

- 级别：低
- 位置：`cloud-functions/_lib/api.js:73-96`
- 证据：注册、登录、订单和管理员写接口已有 Blob 计数限流，但它不是专用边缘 WAF。
- 影响：大规模分布式尝试会产生额外函数调用和 Blob 读写成本。
- 修复：上线后按上线手册为认证、订单和管理员接口配置边缘限频，保留应用层限流作为第二道防线。

## 审查结论

代码层面已满足此低成本人工收费 MVP 的基础安全门槛。“可公开收费”的最后门槛仍是 EdgeOne 真实部署后的响应头、Cookie、Blob 持久化、中国大陆无 VPN 可访问性和管理员操作流程验证。
