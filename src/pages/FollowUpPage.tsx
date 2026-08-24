import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  ChevronDown,
  FilePlus2,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import {
  computeStats,
  deleteFollowUp,
  getSuggestion,
  getUrgency,
  loadFollowUps,
  logFollowUpActivity,
  PRIORITY_DOT,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  PRIORITY_STYLES,
  STAGE_LABELS,
  STAGE_ORDER,
  STAGE_STYLES,
  suggestNextDate,
  upsertFollowUp,
  URGENCY_LABELS,
  URGENCY_STYLES,
  type ActivityKind,
  type FollowUpPriority,
  type FollowUpRecord,
  type FollowUpStage,
} from '../services/followUpStore'

interface FollowUpForm {
  buyerCompany: string
  buyerCountry: string
  buyerContact: string
  buyerPhone: string
  buyerEmail: string
  productSummary: string
  amount: string
  currency: string
  incoterm: string
  stage: FollowUpStage
  priority: FollowUpPriority
  nextFollowUpAt: string
  notes: string
}

const EMPTY_FORM: FollowUpForm = {
  buyerCompany: '',
  buyerCountry: '',
  buyerContact: '',
  buyerPhone: '',
  buyerEmail: '',
  productSummary: '',
  amount: '',
  currency: '美元',
  incoterm: '',
  stage: 'inquiry',
  priority: 'medium',
  nextFollowUpAt: '',
  notes: '',
}

const ACTIVITY_ICON: Record<ActivityKind, typeof MessageSquare> = {
  note: MessageSquare,
  contact: Phone,
  stage: ArrowRight,
  system: Sparkles,
}

const URGENCY_RANK: Record<string, number> = { overdue: 0, today: 1, soon: 2, normal: 3, none: 4 }
const PRIORITY_RANK: Record<FollowUpPriority, number> = { high: 0, medium: 1, low: 2 }

function fmtDate(iso?: string): string {
  return iso ? iso.slice(0, 10) : ''
}
function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function copyText(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  }
}

function sortRecords(list: FollowUpRecord[]): FollowUpRecord[] {
  return [...list].sort((a, b) => {
    const u = URGENCY_RANK[getUrgency(a)] - URGENCY_RANK[getUrgency(b)]
    if (u !== 0) return u
    const p = PRIORITY_RANK[a.priority || 'medium'] - PRIORITY_RANK[b.priority || 'medium']
    if (p !== 0) return p
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone || 'text-ink'}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
    </Card>
  )
}

function FollowUpDetail({ record, onChanged }: { record: FollowUpRecord; onChanged: () => void }) {
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const suggestion = getSuggestion(record)
  const activities = record.activities || []

  function addNote(kind: ActivityKind) {
    if (!note.trim()) return
    logFollowUpActivity(record.id, { kind, text: note.trim() })
    setNote('')
    onChanged()
  }
  function adoptSuggestion() {
    const next = suggestNextDate(suggestion.intervalDays)
    logFollowUpActivity(
      record.id,
      { kind: 'system', text: `已采纳建议：${suggestion.nextAction}`, suggestion: suggestion.script },
      next,
    )
    onChanged()
  }
  function copyScript() {
    copyText(suggestion.script)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      <div className="rounded-xl bg-brand-50/70 p-4">
        <p className="text-xs font-semibold text-brand-700">业务员建议（当前阶段：{STAGE_LABELS[record.stage]}）</p>
        <p className="mt-1 text-sm text-slate-700">建议动作：{suggestion.nextAction}</p>
        <div className="mt-2 rounded-lg border border-brand-100 bg-white p-3 text-sm leading-relaxed text-slate-700">{suggestion.script}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={adoptSuggestion}>采纳并排期（{suggestion.intervalDays} 天后）</Button>
          <Button size="sm" variant="outline" onClick={copyScript}>{copied ? '已复制' : '复制话术'}</Button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500">跟进记录（{activities.length}）</p>
        {activities.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">暂无跟进记录，添加第一条吧。</p>
        ) : (
          <ul className="mt-2 space-y-2.5">
            {[...activities].reverse().map((act) => {
              const Icon = ACTIVITY_ICON[act.kind]
              return (
                <li key={act.id} className="flex gap-2.5 text-sm">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-slate-700">{act.text}</p>
                    {act.suggestion ? <div className="mt-1 rounded border border-slate-100 bg-slate-50 p-2 text-xs leading-relaxed text-slate-600">{act.suggestion}</div> : null}
                    <p className="mt-0.5 text-[11px] text-slate-400">{fmtDateTime(act.at)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Textarea
          aria-label="添加跟进记录"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="记录这次跟进：客户反馈 / 已寄样 / 约好下周三确认…"
          rows={2}
        />
        <div className="flex gap-2 sm:flex-col">
          <Button size="sm" onClick={() => addNote('note')}>加备注</Button>
          <Button size="sm" variant="outline" onClick={() => addNote('contact')}>记联系</Button>
        </div>
      </div>
    </div>
  )
}

export function FollowUpPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<FollowUpRecord[]>(() => loadFollowUps())
  const [filter, setFilter] = useState<FollowUpStage | 'all' | 'due'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FollowUpForm>(EMPTY_FORM)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const stats = useMemo(() => computeStats(records), [records])
  const visible = useMemo(() => {
    const base =
      filter === 'all'
        ? records
        : filter === 'due'
          ? records.filter((r) => {
              const u = getUrgency(r)
              return u === 'overdue' || u === 'today'
            })
          : records.filter((r) => r.stage === filter)
    return sortRecords(base)
  }, [records, filter])

  function reload() {
    setRecords(loadFollowUps())
  }

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setFormOpen(true)
  }

  function openEdit(record: FollowUpRecord) {
    setEditingId(record.id)
    setForm({
      buyerCompany: record.buyer.companyName || '',
      buyerCountry: record.buyer.country || '',
      buyerContact: record.buyer.contact || '',
      buyerPhone: record.buyer.phone || '',
      buyerEmail: record.buyer.email || '',
      productSummary: record.productSummary || '',
      amount: record.amount ? String(record.amount) : '',
      currency: record.currency || '美元',
      incoterm: record.incoterm || '',
      stage: record.stage,
      priority: record.priority || 'medium',
      nextFollowUpAt: record.nextFollowUpAt || '',
      notes: record.notes || '',
    })
    setError('')
    setFormOpen(true)
  }

  function setField<K extends keyof FollowUpForm>(key: K, value: FollowUpForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function save() {
    if (!form.buyerCompany.trim()) {
      setError('请填写客户公司名称。')
      return
    }
    const amount = Number(form.amount.replace(/[, ]/g, ''))
    upsertFollowUp({
      id: editingId ?? undefined,
      buyer: {
        companyName: form.buyerCompany.trim(),
        country: form.buyerCountry.trim(),
        contact: form.buyerContact.trim(),
        phone: form.buyerPhone.trim(),
        email: form.buyerEmail.trim(),
      },
      productSummary: form.productSummary.trim(),
      amount: Number.isFinite(amount) ? amount : 0,
      currency: form.currency.trim() || '美元',
      incoterm: form.incoterm.trim(),
      stage: form.stage,
      priority: form.priority,
      nextFollowUpAt: form.nextFollowUpAt,
      notes: form.notes.trim(),
    })
    reload()
    setFormOpen(false)
    setEditingId(null)
  }

  function advanceStage(record: FollowUpRecord) {
    const index = STAGE_ORDER.indexOf(record.stage)
    if (index < 0 || index >= STAGE_ORDER.length - 1) return
    upsertFollowUp({ ...record, stage: STAGE_ORDER[index + 1] })
    reload()
  }

  function remove(record: FollowUpRecord) {
    if (!window.confirm(`确定删除「${record.buyer.companyName || '该客户'}」的跟单记录吗？此操作无法撤销。`)) return
    deleteFollowUp(record.id)
    reload()
  }

  function newDocument(record: FollowUpRecord) {
    navigate(`/documents?followup=${encodeURIComponent(record.id)}`)
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-600">跟单助手</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">把谈成的客户，变成可跟进的生意</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">一笔跟单从洽谈走到收款的全过程。做报价单 / PI 时可一键加入，客户资料与单据共用；按优先级与紧急度自动排序，谁该跟了一目了然。</p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="h-4 w-4" />
          新增跟单
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="客户总数" value={String(stats.total)} />
        <StatCard label="进行中" value={String(stats.inProgress)} sub="洽谈 + 已报价" />
        <StatCard label="今日待跟进" value={String(stats.dueToday)} tone={stats.dueToday ? 'text-orange-600' : 'text-ink'} />
        <StatCard label="已逾期" value={String(stats.overdue)} tone={stats.overdue ? 'text-red-600' : 'text-ink'} />
        <StatCard label="已成交" value={String(stats.closed)} sub={`${stats.closedAmount.toLocaleString()} ${stats.closed ? '元等价' : ''}`.trim()} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          全部（{records.length}）
        </button>
        <button
          type="button"
          onClick={() => setFilter('due')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === 'due' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          今日待跟进（{stats.dueToday}）
        </button>
        {STAGE_ORDER.map((stage) => (
          <button
            key={stage}
            type="button"
            onClick={() => setFilter(stage)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === stage ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {STAGE_LABELS[stage]}（{records.filter((r) => r.stage === stage).length}）
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        图例：优先级
        <span className="mx-1 inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />高</span>
        <span className="mx-1 inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />中</span>
        <span className="mx-1 inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />低</span>
        ；紧急度按「下次跟进日期」自动推算，列表默认按紧急度 + 优先级排序。
      </p>

      {formOpen ? (
        <Card className="mt-4 space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingId ? '编辑跟单' : '新增跟单'}</h2>
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>收起</Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">客户公司名称 *</span>
              <Input aria-label="客户公司名称" value={form.buyerCompany} onChange={(e) => setField('buyerCompany', e.target.value)} placeholder="例如 北辰户外用品有限公司" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">国家 / 地区</span>
              <Input aria-label="国家地区" value={form.buyerCountry} onChange={(e) => setField('buyerCountry', e.target.value)} />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">联系人</span>
              <Input aria-label="联系人" value={form.buyerContact} onChange={(e) => setField('buyerContact', e.target.value)} />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">电话</span>
              <Input aria-label="电话" value={form.buyerPhone} onChange={(e) => setField('buyerPhone', e.target.value)} />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">邮箱</span>
              <Input aria-label="邮箱" type="email" value={form.buyerEmail} onChange={(e) => setField('buyerEmail', e.target.value)} />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">贸易术语</span>
              <Input aria-label="贸易术语" value={form.incoterm} onChange={(e) => setField('incoterm', e.target.value)} placeholder="如 FOB 深圳" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">金额</span>
              <Input aria-label="金额" value={form.amount} onChange={(e) => setField('amount', e.target.value)} placeholder="0" inputMode="decimal" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">币种</span>
              <Input aria-label="币种" value={form.currency} onChange={(e) => setField('currency', e.target.value)} placeholder="美元" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">下次跟进日期</span>
              <Input aria-label="下次跟进日期" type="date" value={form.nextFollowUpAt} onChange={(e) => setField('nextFollowUpAt', e.target.value)} />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1.5 block">当前阶段</span>
              <select
                aria-label="当前阶段"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={form.stage}
                onChange={(e) => setField('stage', e.target.value as FollowUpStage)}
              >
                {STAGE_ORDER.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
              </select>
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">优先级（重要程度）</span>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setField('priority', p)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    form.priority === p ? `${PRIORITY_STYLES[p]} border-current` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[p]}`} aria-hidden="true" />
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-xs font-medium text-slate-600">
            <span className="mb-1.5 block">产品摘要</span>
            <Input aria-label="产品摘要" value={form.productSummary} onChange={(e) => setField('productSummary', e.target.value)} placeholder="例如 硅胶徽章 ×500件，热熔胶 ×200套" />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            <span className="mb-1.5 block">备注</span>
            <Textarea aria-label="备注" value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows={3} />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button onClick={save}>{editingId ? '保存修改' : '创建跟单'}</Button>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>取消</Button>
          </div>
        </Card>
      ) : null}

      {visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {records.length === 0 ? '还没有跟单记录。在单据中心做报价单时点「加入跟单助手」，或点上方「新增跟单」。' : '该筛选暂无跟单。'}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((record) => {
            const urgency = getUrgency(record)
            const expanded = expandedId === record.id
            return (
              <li key={record.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Briefcase className="h-4 w-4 text-brand-600" aria-hidden="true" />
                        <h3 className="text-base font-semibold text-ink">{record.buyer.companyName || '未命名客户'}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_STYLES[record.stage]}`}>{STAGE_LABELS[record.stage]}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[record.priority || 'medium']}`} aria-hidden="true" />
                          {PRIORITY_LABELS[record.priority || 'medium']}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[urgency]}`}>{URGENCY_LABELS[urgency]}</span>
                        {record.buyer.country ? <span className="text-xs text-slate-400">{record.buyer.country}</span> : null}
                      </div>
                      {record.productSummary ? <p className="mt-1.5 text-sm text-slate-600">{record.productSummary}</p> : null}
                      <p className="mt-1 text-xs text-slate-400">
                        {record.amount ? `${Number(record.amount).toLocaleString()} ${record.currency || ''}`.trim() : '金额未填'}
                        {record.incoterm ? ` · ${record.incoterm}` : ''}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400">
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                        {record.nextFollowUpAt ? `下次跟进：${fmtDate(record.nextFollowUpAt)}` : '未排期跟进'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" onClick={() => newDocument(record)}>
                        <FilePlus2 className="h-4 w-4" />
                        新建单据
                      </Button>
                      {STAGE_ORDER.indexOf(record.stage) < STAGE_ORDER.length - 1 ? (
                        <Button size="sm" variant="outline" onClick={() => advanceStage(record)}>
                          <ArrowRight className="h-4 w-4" />
                          推进阶段
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(record)} aria-label="编辑">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(record)} aria-label="删除">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : record.id)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                    aria-expanded={expanded}
                  >
                    <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                    跟进记录（{(record.activities || []).length}）
                  </button>

                  {expanded ? <FollowUpDetail record={record} onChanged={reload} /> : null}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
