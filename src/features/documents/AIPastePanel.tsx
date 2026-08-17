import { Bot, Copy, LoaderCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { DocumentDraft } from '../../domain/documents'
import { buildExtractionPrompt, parseTradeText, type ParseResult } from '../../services/aiParser'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'

const SAMPLE = '客户：北辰户外用品有限公司，500个硅胶徽章，单价2.80美元，FOB深圳，见提单副本付清。'

export function AIPastePanel({ onApply }: { onApply: (result: ParseResult) => void }) {
  const [source, setSource] = useState('')
  const [prompt, setPrompt] = useState('')
  const [resultText, setResultText] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  function genPrompt() {
    if (!source.trim()) {
      setMessage('请先在上方粘贴客户资料或询盘。')
      return
    }
    const built = buildExtractionPrompt(source)
    setPrompt(built)
    navigator.clipboard?.writeText(built)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
    setMessage('提示词已生成并复制，去你自己的豆包 / Kimi / DeepSeek 网页粘贴即可。')
  }

  async function apply() {
    if (!resultText.trim()) {
      setMessage('请先粘贴 AI 返回的 JSON 结果。')
      return
    }
    setBusy(true)
    try {
      const result = await parseTradeText(resultText, 0)
      onApply(result)
      setMessage(result.summary)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : '解析失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ocean text-white">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold">AI 粘贴识别自动填单</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            本工具不联网、不存你的资料。用你自己的免费 AI 出结果：① 粘贴资料 → ② 生成提示词并复制 → ③ 发给豆包/Kimi/DeepSeek → ④ 把返回的 JSON 贴回下方 → ⑤ 解析填单。
          </p>
        </div>
      </div>

      <Textarea
        className="mt-4 bg-white"
        value={source}
        onChange={(event) => setSource(event.target.value)}
        placeholder="在这里粘贴客户询盘、产品规格或订单备注……"
        aria-label="待识别的外贸资料"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={genPrompt}>
          {copied ? <Copy className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {copied ? '已复制提示词' : '生成提示词并复制'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setSource(SAMPLE)}>
          填入示例资料
        </Button>
      </div>

      {prompt ? (
        <Textarea className="mt-3 bg-white text-xs" readOnly value={prompt} aria-label="已生成的提示词" rows={6} />
      ) : null}

      <Textarea
        className="mt-3 bg-white"
        value={resultText}
        onChange={(event) => setResultText(event.target.value)}
        placeholder="在此粘贴 AI 返回的 JSON 结果（可含解释文字，会自动提取 JSON）……"
        aria-label="AI 返回的 JSON 结果"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={apply} disabled={busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? '正在解析…' : '解析并填单'}
        </Button>
        {message ? <span className="text-xs font-medium text-sky-800">{message}</span> : null}
      </div>
    </section>
  )
}
