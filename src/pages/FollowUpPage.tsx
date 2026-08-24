import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Briefcase, FilePlus2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import {
  computeStats,
  deleteFollowUp,
  loadFollowUps,
  STAGE_LABELS,
  STAGE_ORDER,
  STAGE_STYLES,
  upsertFollowUp,
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
  notes: '',
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
    </Card>
  )
}

export function FollowUpPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<FollowUpRecord[]>(() => loadFollowUps())
  const [filter, setFilter] = useState<FollowUpStage | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FollowUpForm>(EMPTY_FORM)
  const [error, setError] = useState('')

  const stats = useMemo(() => computeStats(records), [records])
  const visible = filter === 'all' ? records : records.filter((record) => record.stage === filter)

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
      notes: record.notes || '',
    })
    setError('')
    setFormOpen(true)
  }

  function setField(key: keyof FollowUpForm, value: string) {
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
          <p className="mt-2 max-w-xl text-sm text-slate-500">一笔跟单从洽谈走到收款的全过程。做报价单 / PI 时可一键加入，客户资料与单据共用，不再两处各录一遍。</p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="h-4 w-4" />
          新增跟单
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="客户总数" value={String(stats.total)} />
        <StatCard label="本月新增" value={String(stats.thisMonthNew)} />
        <StatCard label="进行中" value={String(stats.inProgress)} sub="洽谈 + 已报价" />
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

      {formOpen ? (
        <Card className="mt-6 space-y-4 p-5">
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
          </div>

          <label className="block text-xs font-medium text-slate-600">
            <span className="mb-1.5 block">产品摘要</span>
            <Input aria-label="产品摘要" value={form.productSummary} onChange={(e) => setField('productSummary', e.target.value)} placeholder="例如 硅胶徽章 ×500件，热熔胶 ×200套" />
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
            {records.length === 0 ? '还没有跟单记录。在单据中心做报价单时点「加入跟单助手」，或点上方「新增跟单」。' : '该阶段暂无跟单。'}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((record) => (
            <li key={record.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Briefcase className="h-4 w-4 text-brand-600" aria-hidden="true" />
                      <h3 className="text-base font-semibold text-ink">{record.buyer.companyName || '未命名客户'}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_STYLES[record.stage]}`}>{STAGE_LABELS[record.stage]}</span>
                      {record.buyer.country ? <span className="text-xs text-slate-400">{record.buyer.country}</span> : null}
                    </div>
                    {record.productSummary ? <p className="mt-1.5 text-sm text-slate-600">{record.productSummary}</p> : null}
                    <p className="mt-1 text-xs text-slate-400">
                      {record.amount ? `${Number(record.amount).toLocaleString()} ${record.currency || ''}`.trim() : '金额未填'}
                      {record.incoterm ? ` · ${record.incoterm}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => newDocument(record)}>
                      <FilePlus2 className="h-4 w-4" />
                      新建单据
                    </Button>
                    {STAGE_ORDER.indexOf(record.stage) < STAGE_ORDER.length - 1 ? (
                      <Button size="sm" variant="outline" onClick={() => advanceStage(record)}>
                        <ArrowUpRight className="h-4 w-4" />
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
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
