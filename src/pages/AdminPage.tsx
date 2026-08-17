import { ClipboardCheck, ImageUp, ShieldAlert, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { adminApi, type AdminUser, type AuditEvent, type PaymentSettings } from '../features/membership/adminApi'
import { useMembership } from '../features/membership/MembershipContext'
import type { PaymentOrder, PlanId } from '../features/membership/types'

const orderStatus: Record<string, string> = { awaiting_payment: '等待付款', pending_review: '待核对', confirmed: '已开通', rejected: '信息不匹配' }
const planLabels: Record<PlanId, string> = { monthly: '月度', yearly: '年度', lifetime: '永久' }
const paymentLabels = { wechat: '微信', alipay: '支付宝' } as const
const auditActions: Record<string, string> = { 'order.confirmed': '确认订单并开通会员', 'order.rejected': '标记付款信息不匹配', 'user.status_changed': '更改账号状态', 'user.password_reset': '重置用户密码', 'user.entitlement_granted': '手动开通会员', 'payment.settings_updated': '更新收款码' }

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未填写'
}

function expectedAccess(order: PaymentOrder, user?: AdminUser) {
  if (order.plan === 'lifetime') return '永久会员'
  const days = order.plan === 'yearly' ? 365 : 30
  const currentExpiry = user?.entitlement.expiresAt ? Date.parse(user.entitlement.expiresAt) : 0
  const startsAt = Math.max(Date.now(), currentExpiry)
  return `预计有效至 ${new Date(startsAt + days * 86_400_000).toLocaleDateString('zh-CN')}`
}

function AccessDenied({ signedIn }: { signedIn: boolean }) {
  return <main className="mx-auto grid min-h-[65vh] max-w-xl place-items-center px-5 py-16"><Card className="w-full"><CardContent className="p-8 text-center"><ShieldAlert aria-hidden="true" className="mx-auto h-10 w-10 text-amber-700" /><h1 className="mt-5 text-2xl font-semibold">{signedIn ? '无权访问管理员后台' : '请先登录管理员账号'}</h1><p className="mt-3 text-sm text-slate-600">该页面只向已配置的管理员账号开放。</p><Button asChild className="mt-6"><Link to="/auth">前往登录</Link></Button></CardContent></Card></main>
}

export function AdminPage() {
  const { snapshot, loading } = useMembership()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [orders, setOrders] = useState<PaymentOrder[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [settings, setSettings] = useState<PaymentSettings>({ wechatConfigured: false, alipayConfigured: false, supportContact: '' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [customDays, setCustomDays] = useState<Record<string, string>>({})
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const operationKeys = useRef(new Map<string, string>())

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const [nextUsers, nextOrders, nextAudit, nextSettings] = await Promise.all([adminApi.users(), adminApi.orders(), adminApi.audit(), adminApi.paymentSettings()])
      setUsers(nextUsers); setOrders(nextOrders); setAudit(nextAudit); setSettings(nextSettings)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '管理数据载入失败') } finally { setBusy(false) }
  }, [])

  useEffect(() => { if (snapshot.user?.role === 'admin' && !snapshot.user.passwordResetRequired) void load() }, [snapshot.user?.role, snapshot.user?.passwordResetRequired, load])
  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesText = `${user.username} ${user.contact}`.toLocaleLowerCase('zh-CN').includes(search.trim().toLocaleLowerCase('zh-CN'))
    return matchesText && (statusFilter === 'all' || user.status === statusFilter)
  }), [users, search, statusFilter])

  if (loading) return <main className="grid min-h-[65vh] place-items-center">正在验证管理员身份……</main>
  if (!snapshot.user || snapshot.user.role !== 'admin') return <AccessDenied signedIn={Boolean(snapshot.user)} />
  if (snapshot.user.passwordResetRequired) return <AccessDenied signedIn />

  async function action(work: () => Promise<unknown>, success: string) {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true); setError(''); setMessage('')
    try { await work(); setMessage(success); await load(); return true } catch (reason) { setError(reason instanceof Error ? reason.message : '操作失败'); return false } finally { busyRef.current = false; setBusy(false) }
  }

  async function uploadQr(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await action(() => adminApi.uploadQr(new FormData(event.currentTarget)), '收款码已更新')
  }

  function confirmPaidOrder(order: PaymentOrder) {
    const user = users.find((item) => item.id === order.userId)
    const summary = [
      '请再次核对后确认：',
      `订单号：${order.orderId}`,
      `用户：${order.username}`,
      `方案：${planLabels[order.plan]}`,
      `付款渠道：${order.paymentMethod ? paymentLabels[order.paymentMethod] : '未填写'}`,
      `申报付款时间：${formatDate(order.paidAtClaimed)}`,
      `金额：¥${order.amountCny}`,
      `开通结果：${expectedAccess(order, user)}`,
      '确认后不能重复开通。',
    ].join('\n')
    if (window.confirm(summary)) void action(() => adminApi.confirmOrder(order.orderId, orderNotes[order.orderId]?.trim() || ''), '会员已开通')
  }

  function resetUserPassword(user: AdminUser) {
    if (!window.confirm(`确定重置 ${user.username} 的密码并退出其他会话吗？临时密码将在 24 小时后失效。`)) return
    void action(async () => {
      const result = await adminApi.resetPassword(user.id)
      window.prompt('临时密码（仅显示本次，请复制后安全交给用户）', result.temporaryPassword)
    }, '密码已重置')
  }

  function toggleUserStatus(user: AdminUser) {
    const next = user.status === 'active' ? 'suspended' : 'active'
    const verb = next === 'suspended' ? '停用' : '恢复'
    if (next === 'suspended' && !window.confirm(`确定停用 ${user.username} 并立即退出其所有会话吗？`)) return
    void action(() => adminApi.changeUserStatus(user.id, next), `账号已${verb}`)
  }

  function grantDays(user: AdminUser) {
    const days = Number(customDays[user.id])
    if (!Number.isInteger(days) || days < 1 || days > 3650) { setError('延长天数必须为 1 至 3650 的整数'); return }
    if (window.confirm(`确定为 ${user.username} 延长 ${days} 天吗？`)) void grantAccess(user, `days-${days}`, (key) => adminApi.grantDays(user.id, days, key), `已延长 ${days} 天`)
  }

  async function grantAccess(user: AdminUser, kind: string, work: (key: string) => Promise<unknown>, success: string) {
    const scope = `${user.id}:${kind}`
    const key = operationKeys.current.get(scope) ?? crypto.randomUUID()
    operationKeys.current.set(scope, key)
    if (await action(() => work(key), success)) operationKeys.current.delete(scope)
  }

  function rejectPayment(order: PaymentOrder, mismatch: boolean) {
    const promptText = mismatch ? '请填写信息不匹配原因（用户可见）' : '请填写拒绝原因（用户可见）'
    const note = window.prompt(promptText)
    if (!note?.trim()) return
    const userMessage = mismatch ? `信息不匹配：${note.trim()}` : note.trim()
    void action(() => adminApi.rejectOrder(order.orderId, userMessage, orderNotes[order.orderId]?.trim() || ''), mismatch ? '已标记信息不匹配' : '已拒绝申请')
  }

  return <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-brand-700">仅管理员可见</p><h1 className="mt-2 text-3xl font-semibold">会员与收款管理</h1><p className="mt-2 text-sm text-slate-600">人工核对收款、开通会员和维护账号，所有关键操作均保留审计记录。</p></div><Button variant="outline" onClick={() => void load()} disabled={busy}>刷新数据</Button></div>
    {message ? <p className="mt-5 rounded-xl bg-brand-50 p-3 text-sm text-brand-700" role="status">{message}</p> : null}{error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}

    <section className="mt-8 grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><div className="flex items-center gap-3"><ClipboardCheck aria-hidden="true" className="h-6 w-6 text-brand-600" /><div><h2 className="text-xl font-semibold">待核对订单</h2><p className="text-sm text-slate-500">必须先在对应收款账单中确认到账</p></div></div></CardHeader><CardContent className="space-y-3">{orders.length === 0 ? <p className="text-sm text-slate-500">暂无订单</p> : orders.map((order) => <article key={order.orderId} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><div className="min-w-0"><p className="break-words font-semibold">{order.username} · {planLabels[order.plan]}</p><p className="mt-1 break-all text-xs text-slate-500">{order.orderId}</p></div><p className="text-sm font-semibold">¥{order.amountCny} · {orderStatus[order.status]}</p></div><dl className="mt-3 grid gap-1 text-sm text-slate-600"><div><dt className="inline font-medium">付款渠道：</dt><dd className="inline">{order.paymentMethod ? paymentLabels[order.paymentMethod] : '未提交'}</dd></div><div><dt className="inline font-medium">付款人信息：</dt><dd className="inline break-words">{order.payerHint || '未提交'}</dd></div><div><dt className="inline font-medium">申报付款时间：</dt><dd className="inline">{formatDate(order.paidAtClaimed)}</dd></div></dl>{order.status === 'pending_review' ? <div className="mt-4 space-y-3"><label className="block text-xs font-medium text-slate-600">内部备注（仅管理员可见）<Input className="mt-1" value={orderNotes[order.orderId] ?? ''} onChange={(event) => setOrderNotes((current) => ({ ...current, [order.orderId]: event.target.value }))} maxLength={200} placeholder="例如：已核对微信账单" /></label><div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={() => confirmPaidOrder(order)}>确认到账并开通</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => rejectPayment(order, true)}>标记信息不匹配</Button><Button size="sm" variant="danger" disabled={busy} onClick={() => rejectPayment(order, false)}>拒绝申请</Button></div></div> : null}</article>)}</CardContent></Card>

      <Card><CardHeader><div className="flex items-center gap-3"><ImageUp aria-hidden="true" className="h-6 w-6 text-brand-600" /><div><h2 className="text-xl font-semibold">收款码设置</h2><p className="text-sm text-slate-500">微信和支付宝收款码都配置后才可创建订单</p></div></div></CardHeader><CardContent><p className="mb-4 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700">{settings.wechatConfigured ? '微信已配置' : '微信未配置'} · {settings.alipayConfigured ? '支付宝已配置' : '支付宝未配置'}{settings.supportContact ? ` · 客服：${settings.supportContact}` : ''}</p><form className="space-y-4" onSubmit={uploadQr}><label className="block text-sm font-medium">收款方式<select className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100" name="method" required><option value="wechat">微信支付</option><option value="alipay">支付宝</option></select></label><label className="block text-sm font-medium">收款码图片<Input className="mt-2 pt-2" name="image" type="file" accept="image/png,image/jpeg,image/webp" required /></label><label className="block text-sm font-medium">客服联系方式<Input className="mt-2" name="contact" autoComplete="off" maxLength={64} placeholder="例如：微信号或手机号…" /></label><p className="text-xs leading-5 text-slate-500">仅支持 2MB 以内的 PNG、JPG 或 WebP 图片。</p><Button disabled={busy} type="submit">上传并保存</Button></form></CardContent></Card>
    </section>

    {orders.some((order) => order.adminNote) ? <Card className="mt-6"><CardHeader><h2 className="text-xl font-semibold">已保存的内部备注</h2><p className="text-sm text-slate-500">仅管理员可见，用于回看付款核对依据</p></CardHeader><CardContent className="space-y-2">{orders.filter((order) => order.adminNote).map((order) => <p key={order.orderId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"><span className="font-medium">{order.orderId}：</span>{order.adminNote}</p>)}</CardContent></Card> : null}

    <Card className="mt-6"><CardHeader><div className="flex flex-wrap items-end justify-between gap-4"><div className="flex items-center gap-3"><Users aria-hidden="true" className="h-6 w-6 text-brand-600" /><h2 className="text-xl font-semibold">用户管理</h2></div><div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto"><label className="text-xs font-medium text-slate-600">搜索用户<Input className="mt-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="用户名或联系方式…" /></label><label className="text-xs font-medium text-slate-600">账号状态<select className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">全部状态</option><option value="active">正常</option><option value="suspended">已停用</option></select></label></div></div></CardHeader><CardContent className="grid gap-3 lg:grid-cols-2">{filteredUsers.map((user) => <article key={user.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{user.username}{user.role === 'admin' ? ' · 管理员' : ''}</p><p className="mt-1 break-words text-xs text-slate-500">联系方式：{user.contact || '未填写'}</p><p className="mt-1 text-xs text-slate-500">注册时间：{formatDate(user.createdAt)}</p><p className="mt-1 text-xs text-slate-500">试用截止：{formatDate(user.trialEndsAt)}</p><p className="mt-1 text-xs text-slate-500">会员状态：{user.entitlement.phase === 'active_lifetime' ? '永久会员' : user.entitlement.expiresAt ? `有效至 ${new Date(user.entitlement.expiresAt).toLocaleDateString('zh-CN')}` : user.entitlement.phase === 'trialing' ? '试用中' : '未开通'}</p></div><span className="shrink-0 text-xs font-medium text-brand-700">{user.status === 'active' ? '正常' : '已停用'}</span></div>{user.role !== 'admin' ? <div className="mt-4 space-y-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void grantAccess(user, 'monthly', (key) => adminApi.grantEntitlement(user.id, 'monthly', key), '已手动开通月度会员')}>开通月度</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void grantAccess(user, 'yearly', (key) => adminApi.grantEntitlement(user.id, 'yearly', key), '已手动开通年度会员')}>开通年度</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void grantAccess(user, 'lifetime', (key) => adminApi.grantEntitlement(user.id, 'lifetime', key), '已手动开通永久会员')}>开通永久</Button></div><div className="flex gap-2"><label className="sr-only" htmlFor={`days-${user.id}`}>延长天数</label><Input id={`days-${user.id}`} className="max-w-32" type="number" min={1} max={3650} value={customDays[user.id] ?? ''} onChange={(event) => setCustomDays((current) => ({ ...current, [user.id]: event.target.value }))} placeholder="天数" /><Button size="sm" variant="outline" disabled={busy} onClick={() => grantDays(user)}>按天延长</Button></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => resetUserPassword(user)}>重置密码</Button><Button size="sm" variant={user.status === 'active' ? 'danger' : 'outline'} disabled={busy} onClick={() => toggleUserStatus(user)}>{user.status === 'active' ? '停用账号' : '恢复账号'}</Button></div></div> : null}</article>)}{filteredUsers.length === 0 ? <p className="text-sm text-slate-500">未找到符合条件的用户</p> : null}</CardContent></Card>

    <Card className="mt-6"><CardHeader><div className="flex items-center gap-3"><ShieldAlert aria-hidden="true" className="h-6 w-6 text-brand-600" /><h2 className="text-xl font-semibold">最近审计记录</h2></div></CardHeader><CardContent className="space-y-2">{audit.slice(0, 20).map((event) => <p key={event.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{new Date(event.createdAt).toLocaleString('zh-CN')} · {event.adminUsername} · {auditActions[event.action] ?? '管理操作'} · {event.targetId}</p>)}</CardContent></Card>
  </main>
}
