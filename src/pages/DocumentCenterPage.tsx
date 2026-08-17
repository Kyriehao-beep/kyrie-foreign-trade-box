import { ShieldCheck } from 'lucide-react'
import { DocumentWorkspace } from '../features/documents/DocumentWorkspace'

export function DocumentCenterPage() {
  return <main><div className="border-b border-brand-100 bg-brand-50 px-5 py-3 text-center text-sm font-medium text-brand-800 print:hidden"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" />本地处理、不上传云端；只有未来主动接入真实 AI 时，粘贴内容才会在明确提示后发送。</span></div><DocumentWorkspace /></main>
}
