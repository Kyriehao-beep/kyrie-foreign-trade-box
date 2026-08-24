import { Bot, Copy, LoaderCircle, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { buildExtractionPrompt, extractWithAI, parseTradeText, type ParseResult } from '../../services/aiParser'
import { loadAiConfig, type AiConfig } from '../../services/aiSettings'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'

const SAMPLE = '客户：北辰户外用品有限公司，500个硅胶徽章，单价2.80美元，FOB深圳，见提单副本付清。'

export function AIPastePanel({ onApply }: { onApply: (result: ParseResult) => void }) {
  const [source, setSource] = useState('')
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [prompt, setPrompt] = useState('')
  const [resultText, setResultText] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    setConfig(loadAiConfig())
  }, [])

  async function runAI() {
    if (!source.trim()) {
      setMessage('请先在上方粘贴客户资料或询盘。')
      return
    }
    if (!config?.endpoint) {
      setMessage('AI 识别由站长统一开启，暂不可用。你仍可用下方「手动方式」填单。')
      return
    }
    setBusy(true)
    try {
      const result = await extractWithAI(source, config)
      onApply(result)
      setMessage(result.summary)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : '识别失败')
    } finally {
      setBusy(false)
    }
  }

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
    setMessage('提示词已生成并复制，可发给任意 AI 网页获取 JSON 结果后再用「手动方式」填单。')
  }

  async function applyManual() {
    if (!resultText.trim()) {
      setMessage('请粘贴 AI 返回的 JSON 结果。')
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

  const aiEnabled = !!config?.endpoint

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ocean text-white">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">AI 一键识别自动填单</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            粘贴客户资料，点一次「AI 识别」即自动填好单据。识别由站点统一提供服务，你无需任何配置、也不用懂 API。
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
        <Button type="button" size="sm" onClick={runAI} disabled={busy || !aiEnabled}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? '正在识别…' : 'AI 一键识别并填单'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setSource(SAMPLE)}>
          填入示例资料
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowManual((value) => !value)}>
          {showManual ? '收起手动方式' : '手动 / 不用 API'}
        </Button>
      </div>

      {!aiEnabled ? (
        <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[11px] leading-4 text-amber-700">
          AI 识别由站长统一开启，当前暂不可用。你仍可用「手动方式」：生成提示词发给任意 AI 网页，再把返回的 JSON 贴回解析填单。
        </p>
      ) : null}

      {showManual ? (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs leading-5 text-slate-500">
            不想用 AI？可生成提示词发给任意 AI 网页，再把返回的 JSON 贴回这里解析填单。
          </p>
          <Button type="button" size="sm" variant="outline" onClick={genPrompt}>
            {copied ? <Copy className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {copied ? '已复制提示词' : '生成提示词并复制'}
          </Button>
          {prompt ? <Textarea className="bg-white text-xs" readOnly value={prompt} aria-label="已生成的提示词" rows={6} /> : null}
          <Textarea
            className="bg-white"
            value={resultText}
            onChange={(event) => setResultText(event.target.value)}
            placeholder="在此粘贴 AI 返回的 JSON 结果（可含解释文字，会自动提取 JSON）……"
            aria-label="AI 返回的 JSON 结果"
          />
          <Button type="button" size="sm" onClick={applyManual} disabled={busy}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? '正在解析…' : '解析并填单'}
          </Button>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-xs font-medium text-sky-800">{message}</p> : null}
    </section>
  )
}
