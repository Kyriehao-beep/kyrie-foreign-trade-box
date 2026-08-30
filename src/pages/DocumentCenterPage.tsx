import { ShieldCheck } from 'lucide-react'
import { DocumentWorkspace } from '../features/documents/DocumentWorkspace'

export function DocumentCenterPage() {
  return <main><div className="border-b border-brand-100 bg-brand-50 px-5 py-3 text-center text-sm font-medium text-brand-800 print:hidden"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" />当前单据、草稿和模板均在浏览器本地处理，不会主动上传业务资料。</span></div><DocumentWorkspace /></main>
}
