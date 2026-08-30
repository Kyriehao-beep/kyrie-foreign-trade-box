import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { markServicePromptShown, shouldShowServicePrompt } from './servicePromptSession'

/**
 * 上下文定制服务转化提示：非阻断内联卡片。
 * 仅在「完成一次有价值动作」后由父组件挂载，且同一会话只会出现一次。
 */
export function CustomServiceNudge({ onDismiss }: { onDismiss?: () => void }) {
  const [visible, setVisible] = useState(() => {
    if (!shouldShowServicePrompt()) return false
    markServicePromptShown()
    return true
  })

  if (!visible) return null

  const close = () => {
    markServicePromptShown()
    setVisible(false)
    onDismiss?.()
  }

  return (
    <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-4" role="note" aria-label="定制服务提示">
      <p className="text-sm font-semibold text-ink">你们公司有自己的报价公式或单据格式？</p>
      <p className="mt-1 text-xs leading-6 text-slate-600">可以把现有规则做成团队专用版本，减少重复修改和人工核对。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/about" onClick={close}>
            了解定制服务
          </Link>
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={close}>
          暂时不用
        </Button>
      </div>
    </div>
  )
}
