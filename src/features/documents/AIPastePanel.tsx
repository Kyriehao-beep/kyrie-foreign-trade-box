import { Bot, Copy, KeyRound, LoaderCircle, Settings2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { buildExtractionPrompt, extractWithAI, parseTradeText, type ParseResult } from '../../services/aiParser'
import {
  AI_PROVIDERS,
  clearAiConfig,
  getProvider,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
} from '../../services/aiSettings'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'

const SAMPLE = '客户：北辰户外用品有限公司，500个硅胶徽章，单价2.80美元，FOB深圳，见提单副本付清。'

export function AIPastePanel({ onApply }: { onApply: (result: ParseResult) => void }) {
  const [source, setSource] = useState('')
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [editing, setEditing] = useState(false)
  const [providerId, setProviderId] = useState('siliconflow')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [resultText, setResultText] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    const cfg = loadAiConfig()
    setConfig(cfg)
    if (!cfg) {
      setEditing(true)
      const first = AI_PROVIDERS[0]
      setProviderId(first.id)
      setModel(first.defaultModel)
    }
  }, [])

  function selectProvider(id: string) {
    setProviderId(id)
    const p = getProvider(id)
    setModel(p?.defaultModel ?? '')
    if (id !== 'custom') setBaseUrl('')
  }

  function openSettings() {
    if (config) {
      setProviderId(config.providerId)
      setApiKey(config.apiKey)
      setModel(config.model)
      setBaseUrl(config.baseUrl ?? '')
    } else {
      setApiKey('')
    }
    setEditing((value) => !value)
    setShowManual(false)
  }

  function saveSettings() {
    if (!apiKey.trim()) {
      setMessage('请填写 API Key。')
      return
    }
    if (providerId === 'custom' && !baseUrl.trim()) {
      setMessage('自定义服务需填写 Base URL。')
      return
    }
    if (!model.trim()) {
      setMessage('请填写模型名称。')
      return
    }
    const next: AiConfig = {
      providerId,
      apiKey: apiKey.trim(),
      model: model.trim(),
      ...(providerId === 'custom' ? { baseUrl: baseUrl.trim() } : {}),
    }
    saveAiConfig(next)
    setConfig(next)
    setEditing(false)
    setMessage('AI 服务已配置，现在可一键识别。')
  }

  function clearSettings() {
    clearAiConfig()
    setConfig(null)
    setEditing(true)
    setApiKey('')
    setMessage('已清除 AI 配置。')
  }

  async function runAI() {
    if (!source.trim()) {
      setMessage('请先在上方粘贴客户资料或询盘。')
      return
    }
    if (!config) {
      setEditing(true)
      setMessage('请先配置 AI 服务（服务商 + API Key）。')
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

  const editingCustom = providerId === 'custom'

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ocean text-white">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">AI 一键识别自动填单</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            粘贴客户资料，点一次「AI 识别」即自动填好单据。识别走你自己的低价 / 免费 API（自带 Key，仅存本机），不上传你的资料到任何服务器。
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
        <Button type="button" size="sm" onClick={runAI} disabled={busy || !config}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? '正在识别…' : 'AI 一键识别并填单'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setSource(SAMPLE)}>
          填入示例资料
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={openSettings}>
          <Settings2 className="h-4 w-4" />
          {config ? 'AI 设置' : '配置 AI'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setShowManual((value) => !value); setEditing(false) }}>
          {showManual ? '收起手动方式' : '手动 / 不用 API'}
        </Button>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3 rounded-xl border border-sky-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <KeyRound className="h-4 w-4" />AI 服务设置（一次性，仅存本机浏览器）
          </div>
          <label className="block text-xs font-medium text-slate-600">
            <span className="mb-1.5 block">服务商</span>
            <select
              aria-label="服务商"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={providerId}
              onChange={(event) => selectProvider(event.target.value)}
            >
              {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <p className="text-xs leading-5 text-slate-500">{getProvider(providerId)?.hint}</p>
          {editingCustom ? (
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">Base URL（到 /v1 为止）</span>
              <Input aria-label="Base URL" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://your-endpoint/v1" />
            </label>
          ) : null}
          <label className="block text-xs font-medium text-slate-600">
            <span className="mb-1.5 block">API Key</span>
            <Input aria-label="API Key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="粘贴你的 API Key" />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            <span className="mb-1.5 block">模型名称</span>
            <Input aria-label="模型名称" value={model} onChange={(event) => setModel(event.target.value)} placeholder="如 Qwen/Qwen2.5-7B-Instruct" />
          </label>
          <p className="rounded-lg bg-amber-50 p-2 text-[11px] leading-4 text-amber-700">
            API Key 仅保存在你本机浏览器（localStorage），不会上传到任何服务器，仅用于向你选择的服务商发起请求。请勿在公共电脑保存。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={saveSettings}>保存设置</Button>
            {config ? <Button type="button" size="sm" variant="ghost" onClick={clearSettings}>清除密钥</Button> : null}
          </div>
        </div>
      ) : null}

      {showManual ? (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs leading-5 text-slate-500">
            不想配置 API？可生成提示词发给任意 AI 网页，再把返回的 JSON 贴回这里解析填单。
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
