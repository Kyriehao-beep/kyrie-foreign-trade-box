import { ArrowRight, Calculator, Eye, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AccessibleModal } from '../../components/ui/AccessibleModal'
import { Button } from '../../components/ui/button'

type QuickStartChoice = 'sample' | 'blank' | 'quote'

const CHOICES: { id: QuickStartChoice; icon: typeof Eye; title: string; desc: string }[] = [
  { id: 'sample', icon: Eye, title: '体验示例报价单', desc: '先看看一份完整单据是怎样生成的。' },
  { id: 'blank', icon: FileText, title: '创建空白单据', desc: '直接填写自己的买卖方和产品资料。' },
  { id: 'quote', icon: Calculator, title: '先试试快速报价', desc: '输入成本与数量，先算保本价和建议报价。' },
]

export function QuickStartDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()

  const go = (id: QuickStartChoice) => {
    onClose()
    if (id === 'sample') navigate('/documents?sample=qt')
    else if (id === 'blank') navigate('/documents')
    else navigate('/quote')
  }

  return (
    <AccessibleModal
      open={open}
      onClose={onClose}
      labelledBy="quick-start-title"
      className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-pop"
    >
      <h2 id="quick-start-title" className="text-lg font-bold text-ink">
        想从哪里开始？
      </h2>
      <p className="mt-1 text-sm text-slate-500">选一个最顺手的入口，随时都能切换。</p>
      <div className="mt-4 space-y-2">
        {CHOICES.map((choice) => {
          const Icon = choice.icon
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => go(choice.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-white p-4 text-left transition-colors duration-fast hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">{choice.title}</span>
                <span className="block text-xs text-slate-500">{choice.desc}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          稍后再说
        </Button>
      </div>
    </AccessibleModal>
  )
}
