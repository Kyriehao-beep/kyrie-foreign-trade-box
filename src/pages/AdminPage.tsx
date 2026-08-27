import { Copy, KeyRound, LogOut, QrCode, Server, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { adminApi } from '../features/membership/adminApi'
import { backendAdminApi, type AdminMemberRow } from '../features/membership/backendAdminApi'
import { isBackendEnabled } from '../services/apiClient'
import { PLANS, WECHAT_ID, CONTACT_TIP } from '../features/membership/staticConfig'
import type { PlanId } from '../features/membership/types'

const backend = isBackendEnabled()

/** 本地模式：解锁码管理（纯前端，可离线验证）。 */
function LocalAdmin() {
  const [authed, setAuthed] = useState(adminApi.isLoggedIn())
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [codes, setCodes] = useState(adminApi.listCodes())
  const [copied, setCopied] = useState('')

  function login(event: FormEvent) {
    event.preventDefault()
    const res = adminApi.login(pw)
    if (res === 'ok') {
      setAuthed(true)
      setCodes(adminApi.listCodes())
    } else if (res === 'locked') {
      const min = Math.max(1, Math.ceil(adminApi.lockRemaining() / 60000))
      setPwErr(`尝试次数过多，账户已临时锁定，请约 ${min} 分钟后再试`)
    } else {
      setPwErr('密码错误')
    }
  }
  function gen(plan: PlanId) {
    adminApi.generateCode(plan)
    setCodes(adminApi.listCodes())
  }
  function copy(code: string) {
    navigator.clipboard?.writeText(code)
    setCopied(code)
    window.setTimeout(() => setCopied(''), 1500)
  }
  function logout() {
    adminApi.logout()
    setAuthed(false)
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm px-5 py-20">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <KeyRound className="h-6 w-6 text-brand-600" />
              <h1 className="text-2xl font-semibold">管理员登录</h1>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={login}>
              <label className="block text-sm font-medium">
                管理密码
                <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
              </label>
              {pwErr ? <p className="text-sm text-red-600">{pwErr}</p> : null}
              <Button type="submit" className="w-full">登录</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">解锁码管理（本地模式）</h1>
        <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" />退出</Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">生成解锁码</h2>
          <p className="text-sm text-slate-500">买家付款后，生成对应方案的解锁码，通过微信发给他即可开通。</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {PLANS.map((plan) => (
            <Button key={plan.id} onClick={() => gen(plan.id)}>生成{plan.name}码</Button>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold">收款信息</h2>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p>微信：<span className="font-semibold text-ink">{WECHAT_ID}</span></p>
          <p className="mt-1">{CONTACT_TIP}</p>
          <p className="mt-1 text-slate-400">结账页收款码已在 src/assets/qrCodes.ts 以 base64 内嵌（微信收款码），无需 public/pay 图片；支付宝暂引导微信确认。</p>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">已生成的解锁码（本机记录）</h2>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <p className="text-sm text-slate-500">还没有生成过解锁码。</p>
          ) : (
            <ul className="divide-y">
              {codes.map((entry) => (
                <li key={entry.code} className="flex items-center justify-between py-3">
                  <span className="font-mono text-sm">
                    {entry.code}{' '}
                    <span className="text-slate-400">（{PLANS.find((p) => p.id === entry.plan)?.name}）</span>
                  </span>
                  <Button size="sm" variant="outline" onClick={() => copy(entry.code)}>
                    <Copy className="h-4 w-4" />
                    {copied === entry.code ? '已复制' : '复制'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

/** 后端模式：站长后台（服务端鉴权，按用户名发放/吊销会员）。 */
function BackendAdmin() {
  const [authed, setAuthed] = useState(false)
  const [members, setMembers] = useState<AdminMemberRow[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [grantUser, setGrantUser] = useState('')
  const [grantPlan, setGrantPlan] = useState<PlanId>('yearly')
  const [grantDays, setGrantDays] = useState('365')
  const [msg, setMsg] = useState('')

  async function loadMembers() {
    try {
      setMembers(await backendAdminApi.listMembers())
    } catch {
      setMsg('读取会员列表失败，请重试')
    }
  }

  useEffect(() => {
    void (async () => {
      if (await backendAdminApi.isLoggedIn()) {
        setAuthed(true)
        await loadMembers()
      }
    })()
  }, [])

  async function login(event: FormEvent) {
    event.preventDefault()
    setLoginErr('')
    const ok = await backendAdminApi.login({ username, password })
    if (ok) {
      setAuthed(true)
      await loadMembers()
    } else {
      setLoginErr('站长账号或密码错误')
    }
  }

  async function grant() {
    if (!grantUser.trim()) {
      setMsg('请填写要发放会员的客户用户名')
      return
    }
    try {
      await backendAdminApi.grant({
        username: grantUser.trim(),
        plan: grantPlan,
        days: Number(grantDays) || undefined,
      })
      setMsg(`已为 ${grantUser.trim()} 发放 ${PLANS.find((p) => p.id === grantPlan)?.name}`)
      setGrantUser('')
      await loadMembers()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '发放失败')
    }
  }

  async function revoke(u: string) {
    try {
      await backendAdminApi.revoke(u)
      setMsg(`已吊销 ${u} 的会员`)
      await loadMembers()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '吊销失败')
    }
  }

  function logout() {
    backendAdminApi.logout()
    setAuthed(false)
    setMembers([])
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm px-5 py-20">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Server className="h-6 w-6 text-brand-600" />
              <h1 className="text-2xl font-semibold">站长后台登录</h1>
            </div>
            <p className="text-sm text-slate-500">账号密码由服务端校验，不存储在前端。</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={login}>
              <label className="block text-sm font-medium">
                站长账号
                <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </label>
              <label className="block text-sm font-medium">
                密码
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </label>
              {loginErr ? <p className="text-sm text-red-600">{loginErr}</p> : null}
              <Button type="submit" className="w-full">登录</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">站长后台（服务端）</h1>
        <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" />退出</Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold">发放会员</h2>
          </div>
          <p className="text-sm text-slate-500">按客户用户名直接开通，无需解锁码，客户下次刷新即生效。</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input placeholder="客户用户名" value={grantUser} onChange={(e) => setGrantUser(e.target.value)} />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={grantPlan}
              onChange={(e) => setGrantPlan(e.target.value as PlanId)}
            >
              {PLANS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Input
              className="w-28"
              type="number"
              min={1}
              placeholder="天数"
              value={grantDays}
              onChange={(e) => setGrantDays(e.target.value)}
            />
            <Button onClick={grant}>发放</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">会员列表（{members.length}）</h2>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-slate-500">暂无注册客户。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-2 pr-3">用户名</th>
                    <th className="py-2 pr-3">方案</th>
                    <th className="py-2 pr-3">状态</th>
                    <th className="py-2 pr-3">订单</th>
                    <th className="py-2 pr-3">有效期至</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((m) => (
                    <tr key={m.username}>
                      <td className="py-2 pr-3 font-medium">{m.username}</td>
                      <td className="py-2 pr-3">{m.plan ?? '—'}</td>
                      <td className="py-2 pr-3">{m.hasAccess ? '有效' : '已失效'}</td>
                      <td className="py-2 pr-3">{m.orders}</td>
                      <td className="py-2 pr-3 text-slate-500">
                        {m.memberUntil ? new Date(m.memberUntil).toLocaleDateString() : '永久'}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => void revoke(m.username)}>吊销</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>


      {msg ? <p className="text-sm font-medium text-brand-700">{msg}</p> : null}
    </main>
  )
}

export function AdminPage() {
  return backend ? <BackendAdmin /> : <LocalAdmin />
}
