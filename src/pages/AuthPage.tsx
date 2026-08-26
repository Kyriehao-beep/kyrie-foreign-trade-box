import { KeyRound, ShieldCheck, UserPlus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useMembership } from '../features/membership/MembershipContext'
import { WECHAT_ID } from '../features/membership/staticConfig'

export function AuthPage() {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [contact, setContact] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [supportContact, setSupportContact] = useState('')
  const { snapshot, loading, login, register, changePassword } = useMembership()

  useEffect(() => {
    setSupportContact(WECHAT_ID)
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setFormError('')
    try {
      if (mode === 'register') {
        await register({ username, password, contact })
        setMessage('注册成功，15 天完整试用已开启')
      } else {
        await login({ username, password })
        setMessage('登录成功')
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '操作失败，请稍后重试')
    }
  }

  if (snapshot.user) {
    async function submitPassword(event: FormEvent) {
      event.preventDefault()
      setMessage(''); setFormError('')
      try { await changePassword({ currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); setMessage('密码已更新，其他设备已退出登录') } catch (error) { setFormError(error instanceof Error ? error.message : '密码更新失败') }
    }
    return (
      <main className="mx-auto grid min-h-[65vh] max-w-xl place-items-center px-5 py-16">
        <Card className="w-full text-center">
          <CardContent className="p-8 sm:p-10">
            <ShieldCheck aria-hidden="true" className="mx-auto h-10 w-10 text-brand-600" />
            <h1 className="mt-5 text-2xl font-semibold">已登录：{snapshot.user.username}</h1>
            <p className="mt-3 text-sm text-slate-600">账号与会员状态已在当前设备校验。</p>
            {snapshot.user.passwordResetRequired ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">首次登录必须更换临时密码</p> : null}
            <form className="mt-6 space-y-4 text-left" onSubmit={submitPassword}><label className="block text-sm font-medium">当前密码<Input className="mt-2" name="currentPassword" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" minLength={8} required /></label><label className="block text-sm font-medium">新密码<Input className="mt-2" name="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></label>{formError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{formError}</p> : null}<Button className="w-full" type="submit" disabled={loading}>更新密码</Button></form>
            {message ? <p className="mt-4 text-sm font-medium text-brand-700" role="status">{message}</p> : null}
            {!snapshot.user.passwordResetRequired ? <Button asChild variant="outline" className="mt-4"><Link to="/documents">进入外贸单据中心</Link></Button> : null}
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[1fr_480px] lg:items-center lg:px-8 lg:py-20">
      <section>
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"><ShieldCheck aria-hidden="true" className="h-4 w-4" />试用与会员状态保存在当前设备</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{mode === 'register' ? '创建账号，免费试用 15 天' : '登录 Kyrie的外贸盒子'}</h1>
        <p className="mt-5 max-w-2xl leading-7 text-slate-600">试用期内六类外贸单据、AI 模拟填单、PDF 与 Excel 导出、贸商工具箱全部开放。单据和客户资料仍保存在当前设备。</p>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">{mode === 'register' ? <UserPlus aria-hidden="true" className="h-6 w-6 text-brand-600" /> : <KeyRound aria-hidden="true" className="h-6 w-6 text-brand-600" />}<div><h2 className="text-xl font-semibold">{mode === 'register' ? '注册账号' : '账号登录'}</h2><p className="text-sm text-slate-500">{mode === 'register' ? '联系方式仅用于付款核对与账号服务' : '使用用户名和密码继续使用'}</p></div></div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium">用户名<Input className="mt-2" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" spellCheck={false} minLength={4} maxLength={32} required placeholder="例如：kyrie_export…" /></label>
            <label className="block text-sm font-medium">密码<Input className="mt-2" name="password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required placeholder="至少 8 位字符…" /></label>
            {mode === 'register' ? <label className="block text-sm font-medium">联系方式<Input className="mt-2" name="contact" value={contact} onChange={(event) => setContact(event.target.value)} autoComplete="tel" minLength={2} maxLength={64} required placeholder="例如：微信号或手机号…" /></label> : null}
            {formError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{formError}</p> : null}
            {message ? <p className="rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand-700" role="status">{message}</p> : null}
            <Button className="w-full" disabled={loading} type="submit">{loading ? '正在处理……' : mode === 'register' ? '注册并开始试用' : '登录'}</Button>
          </form>
          <Button variant="ghost" className="mt-3 w-full" type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setFormError(''); setMessage('') }}>{mode === 'register' ? '我已有账号' : '还没有账号，先注册'}</Button>
          {mode === 'login' ? <p className="mt-3 text-center text-xs leading-5 text-slate-500">忘记密码？请联系人工客服{supportContact ? `：${supportContact}` : '，由管理员核实后重置'}。</p> : null}
        </CardContent>
      </Card>
    </main>
  )
}
