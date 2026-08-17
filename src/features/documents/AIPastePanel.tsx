import { Bot, LoaderCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { DocumentDraft } from '../../domain/documents'
import { parseTradeText, type ParseResult } from '../../services/aiParser'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'

const SAMPLE = '客户：北辰户外用品有限公司，500个硅胶徽章，单价2.80美元，FOB深圳，见提单副本付清。'

export function AIPastePanel({ onApply }: { onApply: (result: ParseResult) => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleParse() {
    if (!text.trim()) {
      setMessage('请先粘贴需要识别的资料。')
      return
    }
    setLoading(true)
    try {
      const result = await parseTradeText(text)
      onApply(result)
      setMessage(result.summary)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-ocean text-white"><Bot className="h-5 w-5" /></span><div><h2 className="font-semibold">AI 粘贴识别自动填单</h2><p className="mt-1 text-xs leading-5 text-slate-500">原型使用本地示例解析，不会上传你粘贴的内容。</p></div></div>
      <Textarea className="mt-4 bg-white" value={text} onChange={(event) => setText(event.target.value)} placeholder="在这里粘贴客户询盘、产品规格或订单备注……" aria-label="待识别的外贸资料" />
      <div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" size="sm" onClick={handleParse} disabled={loading}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? '正在识别…' : 'AI 识别填单'}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setText(SAMPLE)}>填入示例资料</Button>{message ? <span className="text-xs font-medium text-sky-800">{message}</span> : null}</div>
    </section>
  )
}
