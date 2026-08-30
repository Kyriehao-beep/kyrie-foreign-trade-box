import { Bookmark, Check, ChevronDown, Copy, FilePlus2, FileText, History, ImagePlus, RotateCcw, Save, Sparkles, Trash2, Upload, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import {
  calculateLineAmount,
  createEmptyDraft,
  createLineItem,
  DOCUMENT_TYPES,
  type DocumentDraft,
  type DocumentLanguage,
  type DocumentLayout,
  type DocumentType,
  type LineItem,
  type Party,
  type PartyTemplate,
  type TradeTerms,
  type SettlementCustoms,
} from '../../domain/documents'
import { getFollowUp, upsertFromDraft } from '../../services/followUpStore'
import { exportExcelDocument } from '../../services/excelExport'
import { exportPdfDocument } from '../../services/pdfExport'
import { clearDraft, deletePartyTemplate, loadDraft, loadPartyTemplates, saveDraft, savePartyTemplate } from '../../services/storage'
import { DocumentPreview } from './DocumentPreview'
import { DocumentPdfExportSurface } from './pdf/DocumentPdfTemplate'
import { createSampleQuotationDraft } from './sampleData'
import { CustomServiceNudge } from '../marketing/CustomServiceNudge'

function Field({ label, value, onChange, type = 'text', name, review = false }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; name?: string; review?: boolean }) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      <span className="mb-1.5 flex items-center gap-2">{label}{review ? <span className="rounded bg-amber-100 px-1.5 text-[10px] font-medium text-amber-700">请核对</span> : null}</span>
      <Input aria-label={label} name={name} type={type} value={value} onChange={(event) => onChange(event.target.value)} className={review ? 'border-amber-300 bg-amber-50' : ''} />
    </label>
  )
}

function CollapsibleSection({ title, done, filled, total, defaultOpen = true, action, children }: { title: string; done: boolean; filled: number; total: number; defaultOpen?: boolean; action?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-line bg-slate-50/50 px-4 py-2.5 print:border-none print:bg-white">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-h-[40px] flex-1 items-center gap-2 rounded-lg text-left text-sm font-semibold text-ink transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-fast ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
          <span>{title}</span>
          {done ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"><Check className="h-3 w-3" aria-hidden="true" />已完成</span>
          ) : (
            <span className="num text-[11px] text-slate-400">已填 {filled}/{total}</span>
          )}
        </button>
        {action}
      </div>
      {open ? <div className="space-y-4 p-5 print:p-0">{children}</div> : null}
    </Card>
  )
}

export function DocumentWorkspace() {
  // 首页「体验示例报价单」通过 ?sample=qt 进入临时示例模式；示例仅在内存中，不写入本地草稿。
  const initialSample = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('sample') === 'qt'
  const [sampleMode, setSampleMode] = useState(initialSample)
  const [type, setType] = useState<DocumentType>('QT')
  const [draft, setDraft] = useState<DocumentDraft>(() => (initialSample ? createSampleQuotationDraft() : (loadDraft('QT').value ?? createEmptyDraft('QT'))))
  const [showServiceNudge, setShowServiceNudge] = useState(false)
  const [saveStatus, setSaveStatus] = useState('准备就绪')
  const [exportStatus, setExportStatus] = useState('')
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form')
  const [isPdfExporting, setIsPdfExporting] = useState(false)
  const [isExcelExporting, setIsExcelExporting] = useState(false)
  const [templates, setTemplates] = useState<PartyTemplate[]>([])
  const [templateMenu, setTemplateMenu] = useState<'seller' | 'buyer' | null>(null)
  const [recentMenu, setRecentMenu] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [undo, setUndo] = useState<{ draft: DocumentDraft; timer: number } | null>(null)
  const pdfRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setTemplates(loadPartyTemplates().value) }, [])

  // 自动保存：先短暂显示「正在保存…」，落盘后显示带时间戳的「已保存 · HH:MM」。
  // 示例模式下暂停自动保存，避免覆盖用户已有的真实草稿。
  useEffect(() => {
    if (sampleMode) return
    setSaveStatus('正在保存…')
    const timer = window.setTimeout(() => {
      const result = saveDraft({ ...draft, updatedAt: new Date().toISOString() })
      if (result.ok) {
        const now = new Date()
        const hh = String(now.getHours()).padStart(2, '0')
        const mm = String(now.getMinutes()).padStart(2, '0')
        setSaveStatus(`已保存 · ${hh}:${mm}`)
      } else {
        setSaveStatus(result.error)
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [draft, sampleMode])

  // 撤销清除的倒计时清理。
  useEffect(() => {
    if (!undo) return
    return () => window.clearTimeout(undo.timer)
  }, [undo])

  // 入向联动：从跟单助手「新建单据」跳转过来时（?followup=id），自动带入该客户资料。
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('followup')
    if (!id) return
    const record = getFollowUp(id)
    if (record) {
      setDraft((current) => ({
        ...current,
        buyer: { ...current.buyer, ...record.buyer },
        trade: {
          ...current.trade,
          incoterm: record.incoterm || current.trade.incoterm,
          currency: record.currency || current.trade.currency,
        },
      }))
      setSaveStatus(`已从跟单助手带入客户：${record.buyer.companyName || ''}`)
    }
    if (window.history?.replaceState) {
      const url = new URL(window.location.href)
      url.searchParams.delete('followup')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  const currentType = useMemo(() => DOCUMENT_TYPES.find((item) => item.code === type)!, [type])

  // 完成度：每个区域是否已填关键字段；聚合为「已完成 X/6 个区域」。
  const completion = useMemo(() => {
    const basic = [draft.documentNumber, draft.issueDate, draft.logo ? '1' : '']
    const parties = [draft.seller.companyName, draft.seller.country, draft.seller.address, draft.seller.contact, draft.buyer.companyName, draft.buyer.country, draft.buyer.address, draft.buyer.contact]
    const products = draft.items
    const trade = [draft.trade.country, draft.trade.incoterm, draft.trade.paymentTerm, draft.trade.currency, draft.trade.deliveryTime, draft.trade.portOfLoading, draft.trade.portOfDestination, draft.trade.validity]
    const settle = [draft.settlement.bankName, draft.settlement.accountName, draft.settlement.accountNumber, draft.settlement.bankAddress, draft.settlement.swift, draft.settlement.transportMode, draft.settlement.customsPort, draft.settlement.marks]
    const sections = [
      { key: 'basic', filled: basic.filter((v) => v.trim()).length, total: basic.length, done: !!draft.documentNumber.trim() && !!draft.issueDate.trim() },
      { key: 'parties', filled: parties.filter((v) => v.trim()).length, total: parties.length, done: !!draft.seller.companyName.trim() && !!draft.buyer.companyName.trim() },
      { key: 'product', filled: products.filter((i) => i.name.trim()).length, total: Math.max(products.length, 1), done: products.some((i) => i.name.trim() && i.quantity > 0) },
      { key: 'trade', filled: trade.filter((v) => v.trim()).length, total: trade.length, done: !!draft.trade.incoterm.trim() && !!draft.trade.currency.trim() },
      { key: 'settle', filled: settle.filter((v) => v.trim()).length, total: settle.length, done: !!draft.settlement.bankName.trim() && !!draft.settlement.accountNumber.trim() },
      { key: 'notes', filled: draft.notes.trim() ? 1 : 0, total: 1, done: !!draft.notes.trim() },
    ]
    const doneCount = sections.filter((s) => s.done).length
    const map = Object.fromEntries(sections.map((s) => [s.key, s])) as Record<string, { filled: number; total: number; done: boolean }>
    return { doneCount, map }
  }, [draft])

  function selectType(nextType: DocumentType) {
    exitSampleMode()
    setType(nextType)
    setDraft(loadDraft(nextType).value ?? createEmptyDraft(nextType))
  }

  // 退出示例模式：丢弃内存中的示例数据，恢复当前类型的真实草稿（如有），并清除查询参数。
  function exitSampleMode() {
    if (!sampleMode) return
    if (window.history?.replaceState) {
      const url = new URL(window.location.href)
      url.searchParams.delete('sample')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
    setSampleMode(false)
    setShowServiceNudge(false)
    setDraft(loadDraft(type).value ?? createEmptyDraft(type))
  }

  // 将示例数据显式保存为当前草稿；若已存在真实草稿，先警告再覆盖。
  function saveSampleAsDraft() {
    const existing = loadDraft(type).value
    if (existing) {
      const ok = window.confirm(`当前已有「${currentType.fullName}」草稿，确定用示例数据覆盖吗？此操作会替换现有草稿。`)
      if (!ok) return
    }
    const result = saveDraft({ ...draft, updatedAt: new Date().toISOString() })
    if (result.ok) {
      if (window.history?.replaceState) {
        const url = new URL(window.location.href)
        url.searchParams.delete('sample')
        window.history.replaceState({}, '', url.pathname + url.search)
      }
      setSampleMode(false)
      setSaveStatus('示例已保存为草稿')
    } else {
      setSaveStatus(result.error)
    }
  }

  function updateParty(kind: 'seller' | 'buyer', key: keyof Party, value: string) {
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], [key]: value } }))
  }

  function updateTrade(key: keyof TradeTerms, value: string) {
    setDraft((current) => ({ ...current, trade: { ...current.trade, [key]: value } }))
  }

  function updateSettlement(key: keyof SettlementCustoms, value: string) {
    setDraft((current) => ({ ...current, settlement: { ...current.settlement, [key]: value } }))
  }

  function updateItem(id: string, key: keyof LineItem, value: string) {
    const numericKeys: (keyof LineItem)[] = ['quantity', 'unitPrice', 'cartons', 'netWeight', 'grossWeight', 'volume']
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, [key]: numericKeys.includes(key) ? Number(value) : value } : item),
    }))
  }

  function saveTemplate(kind: 'seller' | 'buyer') {
    const party = draft[kind]
    if (!party.companyName.trim()) {
      setSaveStatus(`请先填写${kind === 'seller' ? '卖方' : '买方'}公司名称`)
      return
    }
    const result = savePartyTemplate({ ...party, id: `${kind}-${party.companyName}`, name: party.companyName, kind })
    if (result.ok) {
      setTemplates(loadPartyTemplates().value)
      setSaveStatus(`模板已保存：${party.companyName}（可在「选择模板」中调用）`)
    } else {
      setSaveStatus(result.error)
    }
  }

  function applyTemplate(kind: 'seller' | 'buyer', template: PartyTemplate) {
    const fields: Partial<Party> = {
      companyName: template.companyName,
      address: template.address,
      contact: template.contact,
      phone: template.phone,
      email: template.email,
      taxId: template.taxId,
      country: template.country,
    }
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], ...fields } }))
    setSaveStatus(`已填入模板：${template.name}`)
    setTemplateMenu(null)
  }

  function deleteTemplate(template: PartyTemplate) {
    if (!window.confirm(`确定删除模板「${template.name}」吗？此操作无法撤销。`)) return
    const result = deletePartyTemplate(template.id)
    if (result.ok) {
      setTemplates(loadPartyTemplates().value)
      setSaveStatus(`模板已删除：${template.name}`)
    } else {
      setSaveStatus(result.error)
    }
  }

  function resetDraft() {
    setDraft(createEmptyDraft(type))
    setSaveStatus('已新建空白单据')
  }

  function copyDraft() {
    const clone: DocumentDraft = {
      ...draft,
      documentNumber: `${draft.documentNumber || '单据'}-副本`,
      updatedAt: new Date().toISOString(),
    }
    saveDraft(clone)
    setDraft(clone)
    setSaveStatus('已复制当前单据（编号已加「副本」）')
  }

  // 从当前 PI 生成商业发票(CI)与装箱单(PL)，共享买方/产品/贸易/收款字段。
  function generateFromPI() {
    if (type !== 'PI') {
      setSaveStatus('请先切到「形式发票(PI)」，再生成 CI 与 PL')
      return
    }
    const base = (target: DocumentType): DocumentDraft => ({
      ...createEmptyDraft(target),
      documentNumber: draft.documentNumber,
      issueDate: draft.issueDate,
      logo: draft.logo,
      seller: draft.seller,
      buyer: draft.buyer,
      items: draft.items,
      trade: draft.trade,
      settlement: draft.settlement,
      notes: draft.notes,
      language: draft.language,
      layout: draft.layout,
      updatedAt: new Date().toISOString(),
    })
    saveDraft(base('CI'))
    saveDraft(base('PL'))
    setType('CI')
    setDraft(loadDraft('CI').value ?? base('CI'))
    setSaveStatus('已从 PI 生成商业发票(CI)与装箱单(PL)，可切换查看')
    setShowServiceNudge(true)
  }

  function removeDraft() {
    // 二次确认 + 短时间撤销：先暂存当前草稿，清除后提供「撤销」。
    const stash = draft
    clearDraft(type)
    setDraft(createEmptyDraft(type))
    setClearConfirm(false)
    setSaveStatus('当前草稿已清除')
    const timer = window.setTimeout(() => setUndo(null), 6000)
    setUndo({ draft: stash, timer })
  }

  function undoRemove() {
    if (!undo) return
    window.clearTimeout(undo.timer)
    saveDraft(undo.draft)
    setDraft(undo.draft)
    setUndo(null)
    setSaveStatus('已撤销清除，草稿已恢复')
  }

  function addToFollowUp() {
    const name = draft.buyer.companyName.trim()
    if (!name) {
      setSaveStatus('请先填写买方公司名称，再加入到跟单助手。')
      return
    }
    upsertFromDraft(draft)
    setSaveStatus(`已加入跟单助手：${name}（可在「跟单助手」继续跟进）`)
  }

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSaveStatus('请上传图片文件（PNG / JPG / SVG）')
      return
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setSaveStatus('图片过大，请控制在 1.5MB 以内')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDraft((current) => ({ ...current, logo: reader.result as string }))
      setSaveStatus('公司 Logo 已添加')
    }
    reader.onerror = () => setSaveStatus('图片读取失败，请重试')
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    setDraft((current) => ({ ...current, logo: '' }))
    setSaveStatus('已移除公司 Logo')
  }

  async function handlePdfExport() {
    if (!pdfRootRef.current || isPdfExporting) return
    setIsPdfExporting(true)
    setExportStatus('正在生成 PDF…')
    try {
      await exportPdfDocument(pdfRootRef.current, draft.documentNumber)
      setExportStatus('PDF 已导出')
      setShowServiceNudge(true)
    } catch {
      setExportStatus('PDF 生成失败，请检查内容后重试')
    } finally {
      setIsPdfExporting(false)
    }
  }

  async function handleExcelExport() {
    if (isExcelExporting) return
    setIsExcelExporting(true)
    setExportStatus('正在生成 Excel…')
    try {
      await exportExcelDocument(draft)
      setExportStatus('Excel 已导出')
      setShowServiceNudge(true)
    } catch {
      setExportStatus('Excel 生成失败，请检查内容后重试')
    } finally {
      setIsExcelExporting(false)
    }
  }

  const recentDrafts = useMemo(
    () => DOCUMENT_TYPES.map((item) => ({ item, draft: loadDraft(item.code).value })).filter((entry) => entry.draft),
    // 依赖 draft 以便「复制/生成」后刷新最近列表
    [draft],
  )

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-600">外贸单据中心</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">{currentType.fullName}</h1>
            <p className="mt-1 text-sm text-slate-500">{currentType.description}</p>
            {sampleMode ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />示例数据 · 仅演示，未保存到本地
              </p>
            ) : null}
          </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="text-xs font-medium text-slate-600">语言<select aria-label="单据语言" className="ml-1.5 h-10 rounded-xl border border-line bg-white px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value as DocumentLanguage })}><option value="zh">中文</option><option value="en">英文</option><option value="bilingual">双语</option></select></label>
          <label className="text-xs font-medium text-slate-600">版式<select aria-label="版式风格" className="ml-1.5 h-10 rounded-xl border border-line bg-white px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" value={draft.layout} onChange={(event) => setDraft({ ...draft, layout: event.target.value as DocumentLayout })}><option value="modern">现代蓝绿</option><option value="classic">经典外贸</option><option value="minimal">简约商务</option></select></label>
        </div>
      </div>

      {/* 完成度 + 快捷操作 */}
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        {sampleMode ? (
          <>
            <Badge className="bg-amber-100 text-amber-800">示例数据</Badge>
            <Button type="button" variant="outline" size="sm" onClick={saveSampleAsDraft}><Save className="h-4 w-4" aria-hidden="true" />保存为我的草稿</Button>
            <Button type="button" variant="ghost" size="sm" onClick={exitSampleMode}>退出示例</Button>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
              <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />已完成 {completion.doneCount}/6 个区域
            </span>
            <div className="relative">
              <Button type="button" variant="outline" size="sm" onClick={() => setRecentMenu((v) => !v)} aria-expanded={recentMenu}><History className="h-4 w-4" aria-hidden="true" />最近单据</Button>
              {recentMenu ? (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRecentMenu(false)} aria-hidden="true" />
                  <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-line bg-white p-2 shadow-pop">
                    {recentDrafts.length === 0 ? <p className="px-2 py-1.5 text-xs text-slate-400">暂无已保存的单据</p> : recentDrafts.map(({ item, draft: d }) => (
                      <button key={item.code} type="button" onClick={() => { selectType(item.code); setRecentMenu(false) }} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition-colors duration-fast hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                        <span className="truncate">{item.name}</span>
                        <span className="num shrink-0 text-xs text-slate-400">{d ? new Date(d.updatedAt).toLocaleDateString() : ''}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={copyDraft}><Copy className="h-4 w-4" aria-hidden="true" />复制当前单据</Button>
            <Button type="button" variant="outline" size="sm" onClick={generateFromPI} title={type === 'PI' ? '从当前 PI 生成 CI 与 PL' : '请先切到形式发票(PI)'}>{type === 'PI' ? <FileText className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4 opacity-50" aria-hidden="true" />}从 PI 生成 CI·PL</Button>
            <Button type="button" variant="outline" size="sm" onClick={resetDraft}><FilePlus2 className="h-4 w-4" aria-hidden="true" />新建空白单据</Button>
            <Button type="button" variant="outline" size="sm" onClick={addToFollowUp}><Users className="h-4 w-4" aria-hidden="true" />加入跟单助手</Button>
            {clearConfirm ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-2 py-1">
                <span className="text-xs font-medium text-red-700">确认清除？</span>
                <Button type="button" size="sm" variant="danger" onClick={removeDraft}>确认清除</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setClearConfirm(false)}>取消</Button>
              </span>
            ) : (
              <Button type="button" variant="danger" size="sm" onClick={() => setClearConfirm(true)}><Trash2 className="h-4 w-4" aria-hidden="true" />清除草稿</Button>
            )}
          </>
        )}
      </div>

      {/* 上下文定制服务提示：放在始终可见的操作区，避免被预览栏（移动端隐藏）挡住 */}
      {!sampleMode && showServiceNudge ? <CustomServiceNudge onDismiss={() => setShowServiceNudge(false)} /> : null}

      {/* 单据类型切换（示例模式下隐藏，避免误切到其它类型覆盖草稿） */}
      {sampleMode ? null : (
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6 print:hidden">
          {DOCUMENT_TYPES.map((item) => (
            <button key={item.code} type="button" aria-label={item.fullName} aria-pressed={type === item.code} onClick={() => selectType(item.code)} className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-3 text-center transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${type === item.code ? 'border-brand-500 bg-brand-600 text-white shadow-soft' : 'border-line bg-white text-slate-600 hover:border-brand-200'}`}>
              <span className="text-xs font-bold opacity-70">{item.code}</span>
              <span className="text-xs font-semibold leading-tight">{item.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 手机端：填写 / 预览 切换 */}
      <div className="mb-4 grid grid-cols-2 gap-2 lg:hidden print:hidden">
        <Button variant={mobileView === 'form' ? 'default' : 'outline'} onClick={() => setMobileView('form')}>填写资料</Button>
        <Button variant={mobileView === 'preview' ? 'default' : 'outline'} onClick={() => setMobileView('preview')}>预览单据</Button>
      </div>

      <div className={`grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(520px,.95fr)] ${mobileView === 'preview' ? 'lg:grid' : ''}`}>
        <div className={`${mobileView === 'preview' ? 'hidden lg:block' : ''} min-w-0 space-y-4 print:hidden`}>
          {draft.reviewFields.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>请人工核对：</strong>
              {draft.reviewFields.map((field) => <span key={field} className="rounded-full bg-white px-2 py-1">{field}</span>)}
            </div>
          ) : null}

          <CollapsibleSection title="基本信息" done={completion.map.basic.done} filled={completion.map.basic.filled} total={completion.map.basic.total}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="单据编号" name="documentNumber" value={draft.documentNumber} onChange={(value) => setDraft({ ...draft, documentNumber: value })} />
              <Field label="开具日期" type="date" name="issueDate" value={draft.issueDate} onChange={(value) => setDraft({ ...draft, issueDate: value })} />
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-line bg-slate-50/60 p-3">
              <div className="grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
                {draft.logo ? <img src={draft.logo} alt="公司 Logo 预览" className="max-h-16 max-w-28 object-contain" /> : <ImagePlus className="h-5 w-5 text-slate-300" aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs leading-5 text-slate-500">上传企业 Logo，将显示在单据抬头左侧。建议透明背景 PNG，1.5MB 以内。</p>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-fast hover:border-brand-300 focus-within:ring-2 focus-within:ring-brand-500">
                  <Upload className="h-4 w-4" aria-hidden="true" />选择图片
                  <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} aria-label="上传公司 Logo" />
                </label>
                {draft.logo ? <button type="button" onClick={removeLogo} className="ml-2 text-xs text-slate-400 underline transition-colors duration-fast hover:text-red-600">移除</button> : null}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="买卖方资料"
            done={completion.map.parties.done}
            filled={completion.map.parties.filled}
            total={completion.map.parties.total}
            action={null}
          >
            {(['seller', 'buyer'] as const).map((kind) => {
              const party = draft[kind]
              const prefix = kind === 'seller' ? '卖方' : '买方'
              return (
                <div key={kind} className="rounded-xl border border-line bg-slate-50/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{prefix}资料</span>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" size="sm" variant="ghost" onClick={() => saveTemplate(kind)}><Save className="h-3.5 w-3.5" aria-hidden="true" />存为模板</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setTemplates(loadPartyTemplates().value); setTemplateMenu(templateMenu === kind ? null : kind) }} aria-expanded={templateMenu === kind}>选模板 ▾</Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={`${prefix}公司名称`} name={`${kind}-company`} value={party.companyName} review={draft.reviewFields.includes(`${prefix}公司名称`)} onChange={(value) => updateParty(kind, 'companyName', value)} />
                    <Field label={`${prefix}国家或地区`} name={`${kind}-country`} value={party.country} onChange={(value) => updateParty(kind, 'country', value)} />
                    <Field label={`${prefix}地址`} name={`${kind}-address`} value={party.address} review={draft.reviewFields.includes(`${prefix}地址`)} onChange={(value) => updateParty(kind, 'address', value)} />
                    <Field label={`${prefix}联系人`} name={`${kind}-contact`} value={party.contact} onChange={(value) => updateParty(kind, 'contact', value)} />
                    <Field label={`${prefix}电话`} name={`${kind}-phone`} value={party.phone} onChange={(value) => updateParty(kind, 'phone', value)} />
                    <Field label={`${prefix}邮箱`} name={`${kind}-email`} value={party.email} onChange={(value) => updateParty(kind, 'email', value)} />
                    <Field label={`${prefix}税号`} name={`${kind}-tax`} value={party.taxId} onChange={(value) => updateParty(kind, 'taxId', value)} />
                  </div>
                  {templateMenu === kind ? (
                    <div className="relative mt-3">
                      <div className="rounded-xl border border-line bg-white p-2 shadow-pop">
                        {templates.filter((t) => t.kind === kind).length === 0 ? (
                          <p className="px-2 py-1.5 text-xs text-slate-400">暂无保存的模板</p>
                        ) : (
                          templates.filter((t) => t.kind === kind).map((t) => (
                            <div key={t.id} className="group flex items-center gap-1 rounded-lg px-1 hover:bg-brand-50">
                              <button type="button" onClick={() => applyTemplate(kind, t)} className="min-w-0 flex-1 px-1 py-1.5 text-left text-sm text-slate-700">{t.name}</button>
                              <button type="button" aria-label={`删除模板 ${t.name}`} onClick={(event) => { event.stopPropagation(); deleteTemplate(t) }} className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors duration-fast hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </CollapsibleSection>

          <CollapsibleSection
            title="产品明细"
            done={completion.map.product.done}
            filled={completion.map.product.filled}
            total={completion.map.product.total}
            action={<Button type="button" size="sm" onClick={() => setDraft((current) => ({ ...current, items: [...current.items, createLineItem()] }))}>新增产品行</Button>}
          >
            <div className="space-y-4">
              {draft.items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-line bg-slate-50/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-700">产品 {index + 1}</span>
                    {draft.items.length > 1 ? <Button type="button" size="sm" variant="ghost" aria-label={`删除产品 ${index + 1}`} onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }))}><X className="h-4 w-4" /></Button> : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label={`品名 ${index + 1}`} name={`name-${item.id}`} value={item.name} onChange={(value) => updateItem(item.id, 'name', value)} />
                    <Field label={`规格 ${index + 1}`} name={`spec-${item.id}`} value={item.specification} onChange={(value) => updateItem(item.id, 'specification', value)} />
                    <Field label={`数量 ${index + 1}`} type="number" name={`qty-${item.id}`} value={item.quantity} onChange={(value) => updateItem(item.id, 'quantity', value)} />
                    <Field label={`单位 ${index + 1}`} name={`unit-${item.id}`} value={item.unit} onChange={(value) => updateItem(item.id, 'unit', value)} />
                    <Field label={`单价 ${index + 1}`} type="number" name={`price-${item.id}`} value={item.unitPrice} onChange={(value) => updateItem(item.id, 'unitPrice', value)} />
                    <Field label={`金额 ${index + 1}`} value={calculateLineAmount(item)} onChange={() => undefined} />
                    <Field label={`箱数 ${index + 1}`} type="number" name={`cartons-${item.id}`} value={item.cartons} onChange={(value) => updateItem(item.id, 'cartons', value)} />
                    <Field label={`单件净重 ${index + 1}`} type="number" name={`nw-${item.id}`} value={item.netWeight} onChange={(value) => updateItem(item.id, 'netWeight', value)} />
                    <Field label={`单件毛重 ${index + 1}`} type="number" name={`gw-${item.id}`} value={item.grossWeight} onChange={(value) => updateItem(item.id, 'grossWeight', value)} />
                    <Field label={`单件体积 ${index + 1}`} type="number" name={`vol-${item.id}`} value={item.volume} onChange={(value) => updateItem(item.id, 'volume', value)} />
                    <Field label={`HS 编码 ${index + 1}`} name={`hs-${item.id}`} value={item.hsCode} onChange={(value) => updateItem(item.id, 'hsCode', value)} />
                    <Field label={`申报要素 ${index + 1}`} name={`decl-${item.id}`} value={item.declarationElements} onChange={(value) => updateItem(item.id, 'declarationElements', value)} />
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="贸易条款" done={completion.map.trade.done} filled={completion.map.trade.filled} total={completion.map.trade.total}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="贸易国家" name="trade-country" value={draft.trade.country} onChange={(value) => updateTrade('country', value)} />
              <Field label="贸易术语" name="trade-incoterm" value={draft.trade.incoterm} onChange={(value) => updateTrade('incoterm', value)} />
              <Field label="付款方式" name="trade-payment" value={draft.trade.paymentTerm} onChange={(value) => updateTrade('paymentTerm', value)} />
              <Field label="币种" name="trade-currency" value={draft.trade.currency} onChange={(value) => updateTrade('currency', value)} />
              <Field label="交货周期" name="trade-delivery" value={draft.trade.deliveryTime} onChange={(value) => updateTrade('deliveryTime', value)} />
              <Field label="装运港" name="trade-pol" value={draft.trade.portOfLoading} onChange={(value) => updateTrade('portOfLoading', value)} />
              <Field label="目的港" name="trade-pod" value={draft.trade.portOfDestination} review={draft.reviewFields.includes('目的港')} onChange={(value) => updateTrade('portOfDestination', value)} />
              <Field label="报价有效期" name="trade-validity" value={draft.trade.validity} onChange={(value) => updateTrade('validity', value)} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="收款与清关资料" done={completion.map.settle.done} filled={completion.map.settle.filled} total={completion.map.settle.total}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="开户行" name="bank-name" value={draft.settlement.bankName} onChange={(value) => updateSettlement('bankName', value)} />
              <Field label="账户名称" name="bank-account-name" value={draft.settlement.accountName} onChange={(value) => updateSettlement('accountName', value)} />
              <Field label="银行账号" name="bank-account" value={draft.settlement.accountNumber} onChange={(value) => updateSettlement('accountNumber', value)} />
              <Field label="银行地址" name="bank-addr" value={draft.settlement.bankAddress} onChange={(value) => updateSettlement('bankAddress', value)} />
              <Field label="SWIFT" name="bank-swift" value={draft.settlement.swift} onChange={(value) => updateSettlement('swift', value)} />
              <Field label="运输方式" name="settle-transport" value={draft.settlement.transportMode} onChange={(value) => updateSettlement('transportMode', value)} />
              <Field label="报关口岸" name="settle-customs" value={draft.settlement.customsPort} onChange={(value) => updateSettlement('customsPort', value)} />
              <Field label="唛头" name="settle-marks" value={draft.settlement.marks} onChange={(value) => updateSettlement('marks', value)} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="备注与合同条款" done={completion.map.notes.done} filled={completion.map.notes.filled} total={completion.map.notes.total}>
            <label className="block text-xs font-medium text-slate-600"><span className="mb-1.5 block">备注与合同条款</span>
              <Textarea aria-label="备注与合同条款" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
            </label>
          </CollapsibleSection>
        </div>

        <aside className={`${mobileView === 'form' ? 'hidden lg:block' : ''} min-w-0 lg:sticky lg:top-28 lg:self-start`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <span className="num text-xs font-medium text-slate-500" role="status" aria-live="polite">{exportStatus || saveStatus}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" disabled={isPdfExporting} onClick={() => void handlePdfExport()}>{isPdfExporting ? '正在生成…' : '导出 PDF'}</Button>
                <Button type="button" size="sm" disabled={isExcelExporting} onClick={() => void handleExcelExport()}>{isExcelExporting ? '正在生成…' : '导出 Excel'}</Button>
              </div>
          </div>
          <div className="max-h-[calc(100vh-180px)] overflow-auto rounded-2xl bg-slate-200/70 p-3 lg:p-5 print:max-h-none print:overflow-visible print:bg-white print:p-0"><DocumentPreview draft={draft} /></div>
        </aside>
      </div>

      {/* 撤销清除提示 */}
      {undo ? (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-panel border border-line bg-white px-4 py-3 shadow-pop lg:bottom-6" role="status" aria-live="polite">
          <RotateCcw className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <span className="text-sm text-slate-700">草稿已清除</span>
          <Button type="button" size="sm" variant="ghost" onClick={undoRemove}>撤销</Button>
        </div>
      ) : null}

      <div ref={pdfRootRef}><DocumentPdfExportSurface draft={draft} /></div>
    </div>
  )
}
