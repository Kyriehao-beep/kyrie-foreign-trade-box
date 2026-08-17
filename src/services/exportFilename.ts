export function safeExportFilenameBase(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 80)
    .replace(/[.\s-]+$/g, '')
  return sanitized || '外贸单据'
}
