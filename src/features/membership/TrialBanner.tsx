import { Clock3, Sparkles } from 'lucide-react'
import { useMembership } from './MembershipContext'

export function TrialBanner() {
  const { status, loading, error } = useMembership()
  if (loading) return <div className="border-b border-brand-100 bg-brand-50 px-5 py-2.5 text-center text-xs text-brand-700 print:hidden">正在安全验证账号状态……</div>
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 bg-brand-50 px-5 py-2.5 text-sm text-brand-900 print:hidden">
      <span className="flex items-center gap-2 font-medium">
        {status.phase === '试用中' ? <Clock3 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {error || (status.phase === '试用中' ? `完整试用中，还可使用约 ${status.remainingDays} 天` : status.phase === '已激活' ? '会员功能已激活' : status.phase === '已停用' ? '账号已停用，请联系人工客服' : status.phase === '未登录' ? '登录后可开启 15 天完整试用' : '免费试用已结束')}
      </span>
      <span className="text-xs text-brand-700">试用期内所有功能完整开放，会员状态以服务器记录为准</span>
    </div>
  )
}
