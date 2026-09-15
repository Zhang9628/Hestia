/**
 * session 悬停信息增强：把对话轮数 + token 用量（输入 / 输出 tok）注入会话悬停卡（hover card）。
 *
 * 数据来源（纯 client，无 host 半）：
 * host 端注册的两个 session 投影已被推送到浏览器，挂在 client `sessions.list`
 * 快照的 `byId[id].projectionValues` 上：
 * - `tokenUsage`（token-meter）：`{ uncachedInputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }`。
 *   「输入」= uncachedInputTokens + cacheReadTokens + cacheWriteTokens（与对话底部
 *   StatsLine 的 `billedInputTokens` 口径一致）；「输出」= outputTokens。
 * - `sessionStats`（session-stats）：`{ turns, steps, ... }`，取 `turns`（有效对话轮数）。
 *
 * 逆向结论（见 dsh-client-ui-workspace 源码）：
 * - 会话悬停卡内容 = `[class*="hoverContent"]`（SessionHoverContent），子元素依次是
 *   hoverTitle / hoverTime / hoverStatus。
 * - 项目（workspace）悬停卡复用同一个 `hoverContent` 类，但没有 hoverStatus 子元素，
 *   用「有无 [class*="hoverStatus"]」区分，避免误注入。
 * - 悬停卡标题文本 = session.displayTitle（非 blank），与列表行标题一致，故沿用
 *   pin/color 的「标题 → sessionId」映射定位（仅标题唯一时匹配，标题冲突则跳过）。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

/** tokenUsage 投影的最小结构视图（运行时由 host token-meter 推送）。 */
interface HestiaTokenUsage {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}
/** sessionStats 投影的最小结构视图（运行时由 host session-stats 推送）。 */
interface HestiaSessionStats {
  turns: number
}
/** 会话列表快照的最小结构视图（运行时由 shell 的 dsh-client-runtime 提供）。 */
interface HestiaSessionSummary {
  id: string
  title?: string
  displayTitle: string
  blank: boolean
  projectionValues?: Readonly<{ tokenUsage?: HestiaTokenUsage; sessionStats?: HestiaSessionStats }>
}
interface HestiaSessionListState {
  ids: string[]
  byId: Record<string, HestiaSessionSummary>
  current?: string
}
interface HestiaObservableSnapshot<T> {
  getSnapshot(): T
  subscribe(fn: () => void): () => void
}
/** sessions 服务的最小结构视图（只用 list 快照，避免引入完整 ISessions 类型）。 */
interface HestiaSessionsService {
  list: HestiaObservableSnapshot<HestiaSessionListState>
}

/** 与 StatsLine 一致的紧凑 token 计数：517 / 12.2K / 517K / 1.2M（三位以内保留一位小数）。 */
function formatTokens(n: number): string {
  const scaled = (v: number) => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10))
  if (n < 1e3) return String(n)
  if (n < 1e6) return `${scaled(n / 1e3)}K`
  return `${scaled(n / 1e6)}M`
}

/** 计费输入 token = 三个不相交的 prompt 侧桶之和（与 StatsLine.billedInputTokens 一致）。 */
function billedInputTokens(usage: HestiaTokenUsage): number {
  return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
}

/** 标题 → 会话 id（跳过 blank 会话）。 */
function buildTitleMap(list: HestiaSessionListState): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const id of list.ids) {
    const summary = list.byId[id]
    if (summary === undefined || summary.blank) continue
    const title = summary.displayTitle.trim()
    if (title === '') continue
    const ids = map.get(title)
    if (ids === undefined) map.set(title, [id])
    else ids.push(id)
  }
  return map
}

/** 悬停卡标题 → 会话 id（仅标题唯一时匹配）。 */
function resolveSessionId(title: string, titleMap: Map<string, string[]>): string | undefined {
  if (title === '') return undefined
  const ids = titleMap.get(title)
  if (ids === undefined || ids.length !== 1) return undefined
  return ids[0]
}

class UsageController {
  private readonly sessions: HestiaSessionsService
  private observer: MutationObserver | null = null
  private unsubscribe: (() => void) | null = null
  private rafId: number | null = null

  constructor(sessions: HestiaSessionsService) {
    this.sessions = sessions
  }

  start(): void {
    this.unsubscribe = this.sessions.list.subscribe(() => this.schedule())
    this.refresh()
    this.observer = new MutationObserver(() => this.schedule())
    this.observer.observe(document.body, { childList: true, subtree: true })
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.observer?.disconnect()
    this.observer = null
    this.unsubscribe?.()
    this.unsubscribe = null
    // 清理已注入的 token 行（悬停卡通常随 hover 一起卸载，这里兜底）。
    for (const el of Array.from(document.querySelectorAll('.dshusage-hover'))) el.remove()
  }

  private schedule(): void {
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.refresh()
    })
  }

  private refresh(): void {
    const list = this.sessions.list.getSnapshot()
    const titleMap = buildTitleMap(list)
    for (const content of Array.from(document.querySelectorAll('[class*="hoverContent"]'))) {
      this.syncContent(content, list, titleMap)
    }
  }

  /** 为一个悬停卡内容注入/更新用量行（轮数 + 输入/输出 tok）。 */
  private syncContent(content: Element, list: HestiaSessionListState, titleMap: Map<string, string[]>): void {
    // 只处理会话悬停卡（有 hoverStatus 子元素）；项目卡无 hoverStatus，跳过。
    if (content.querySelector('[class*="hoverStatus"]') === null) return

    const titleEl = content.querySelector('[class*="hoverTitle"]')
    const title = titleEl !== null ? (titleEl.textContent ?? '').trim() : ''
    const id = resolveSessionId(title, titleMap)
    if (id === undefined) return

    const projections = list.byId[id]?.projectionValues
    const usage = projections?.tokenUsage
    const stats = projections?.sessionStats
    const input = usage !== undefined ? billedInputTokens(usage) : 0
    const output = usage !== undefined ? usage.outputTokens : 0
    const turns = stats?.turns ?? 0

    // 逐段拼接，缺哪段就省略哪段（轮数 / token 各有独立存在条件）。
    const parts: string[] = []
    if (turns > 0) parts.push(`${turns} 轮`)
    if (input > 0 || output > 0) parts.push(`输入 ${formatTokens(input)} tok · 输出 ${formatTokens(output)} tok`)

    let line = content.querySelector('.dshusage-hover')
    if (parts.length === 0) {
      if (line !== null) line.remove()
      return
    }
    if (line === null) {
      line = document.createElement('div')
      line.className = 'dshusage-hover'
      // 追加为最后一个子元素（状态行之后），避免 React 按索引 diff 时顶掉注入节点。
      content.appendChild(line)
    }
    line.textContent = parts.join(' · ')
  }
}

/** 装配入口：订阅 sessions.list + 观察 DOM，为会话悬停卡注入用量行（轮数 + token 用量）。 */
export function initSessionUsage(ctx: ClientContext): void {
  if (typeof document === 'undefined') return
  const sessions = ctx.get('sessions') as HestiaSessionsService | undefined
  if (sessions === undefined) return
  const controller = new UsageController(sessions)
  ctx.effect(() => {
    controller.start()
    return () => controller.dispose()
  })
}
