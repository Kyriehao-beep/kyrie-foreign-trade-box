import { KeyRound, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { redeemCode } from '../features/membership/membershipApi'
import { useMembership } from '../features/membership/MembershipContext'
import { planName } from '../features/membership/staticConfig'
import type { PlanId } from '../features/membership/types'

export function UnlockPage() {
  const { refresh } = useMembership()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<PlanId | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setError('')
    try {
      const { plan } = await redeemCode(code)
      await refresh()
      setDone(plan)
      window.setTimeout(() => navigate('/documents'), 1500)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '解锁失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <KeyRound className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-semibold">输入解锁码</h1>
          </div>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="rounded-xl bg-brand-50 p-4 text-center text-sm font-medium text-brand-700">
              已成功开通{planName(done)}，正在进入工作台……
            </p>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <label className="block text-sm font-medium">
                解锁码
                <Input
                  className="mt-2"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="KTB-MXXXXXX-XXXXXX"
                  autoFocus
                />
              </label>
              {error ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
                验证并开通
              </Button>
              <p className="text-center text-xs text-slate-500">
                解锁码由管理员在付款后通过微信发送。没有码？先去
                <Link className="text-brand-600 underline" to="/membership">
                  会员中心
                </Link>
                付款。
              </p>
            </form>
          )}
          <Button asChild variant="ghost" className="mt-4 w-full">
            <Link to="/">返回首页</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
