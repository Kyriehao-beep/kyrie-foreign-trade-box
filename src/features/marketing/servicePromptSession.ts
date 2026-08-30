// 同一会话内只展示一次定制服务转化提示（不跨页面重复弹出）。
const KEY = 'ktb_service_prompt_shown'

export function shouldShowServicePrompt(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== '1'
  } catch {
    return true
  }
}

export function markServicePromptShown(): void {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // 忽略：隐私模式或存储不可用时，退化为「每次都展示」。
  }
}
