import { Copy, KeyRound, LogOut, QrCode } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { adminApi } from '../features/membership/adminApi'
import { PLANS, WECHAT_ID, CONTACT_TIP } from '../features/membership/staticConfig'
import type { PlanId } from '../features/membership/types'

export function AdminPage() {
  const [authed, setAuthed] = useState(adminApi.isLoggedIn())
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [codes, setCodes] = useState(adminApi.listCodes())
  const [copied, setCopied] = useState('')

  function login(event: FormEvent) {
    event.preventDefault()
    if (adminApi.login(pw)) {
      setAuthed(true)
      setCodes(adminApi.listCodes())
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
        <h1 className="text-2xl font-semibold">解锁码管理</h1>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />退出
        </Button>
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
          <p className="mt-1 text-slate-400">收款码图片请放到项目 public/pay/wechat.png 与 alipay.png 后重新部署。</p>
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
