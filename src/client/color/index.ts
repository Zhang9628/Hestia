/**
 * session / 工作区 标识颜色：列表增强（纯 client，无 host 半）。
 *
 * 思路（对应架构路线「存 sessionId→色，列表项加色条」，扩展到工作区行）：
 * - 色表存 localStorage：会话 `hestia-session-colors`、工作区 `hestia-workspace-colors`
 *   （都是 JSON 对象 `{ id: '#hex' }`）。
 * - 订阅 client `sessions.list` + `workspaces.list` 快照，分别按 `displayTitle` /
 *   `title` 建立「标题 → id」映射。
 * - MutationObserver 监听列表 DOM：给会话行（`[class*="sessionRow"]`）与工作区行
 *   （`[class*="projectRow"]`）加左侧色条 + 注入颜色按钮（hover 显示），点击弹调色板。
 *
 * 逆向结论：会话行标题在直接子 `[class*="title"]`；工作区行标题在 `.projectText > .title`
 * （多嵌套一层），故标题统一用 `querySelector('[class*="title"]')` 取。工作区行被
 * HoverCard 包一层 wrapper，未分组桶无 workspaceId（标题为本地化「Ungrouped」），跳过。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

/** 会话列表快照的最小结构视图（运行时由 shell 的 dsh-client-runtime 提供）。 */
interface HestiaSessionSummary {
  id: string
  title?: string
  displayTitle: string
  blank: boolean
}
interface HestiaSessionListState {
  ids: string[]
  byId: Record<string, HestiaSessionSummary>
  current?: string
}
/** 工作区列表快照的最小结构视图。 */
interface HestiaWorkspaceView {
  workspaceId: string
  title: string
}
interface HestiaWorkspaceListState {
  items: readonly HestiaWorkspaceView[]
}
interface HestiaObservableSnapshot<T> {
  getSnapshot(): T
  subscribe(fn: () => void): () => void
}
interface HestiaSessionsService {
  list: HestiaObservableSnapshot<HestiaSessionListState>
}
interface HestiaWorkspacesService {
  list: HestiaObservableSnapshot<HestiaWorkspaceListState>
}

const SESSION_COLOR_KEY = 'hestia-session-colors'
const WORKSPACE_COLOR_KEY = 'hestia-workspace-colors'
/** 粘性解析：会话 id 暂存在行上，标题被重写/截断时仍可复用（与 pin 模块共用）。 */
const ROW_ID_ATTR = 'data-hestia-row-id'

type ColorKind = 'session' | 'workspace'

/** 预设标识色（8 色）。 */
const PRESET_COLORS: ReadonlyArray<{ hex: string; label: string }> = [
  { hex: '#ef4444', label: '红' },
  { hex: '#f97316', label: '橙' },
  { hex: '#eab308', label: '黄' },
  { hex: '#22c55e', label: '绿' },
  { hex: '#3b82f6', label: '蓝' },
  { hex: '#8b5cf6', label: '紫' },
  { hex: '#ec4899', label: '粉' },
  { hex: '#6b7280', label: '灰' },
]

function loadColorMap(key: string): Map<string, string> {
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const map = new Map<string, string>()
        for (const [id, color] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof color === 'string' && color.startsWith('#')) map.set(id, color)
        }
        return map
      }
    }
  } catch {
    // ignore
  }
  return new Map()
}

function saveColorMap(key: string, map: Map<string, string>): void {
  try {
    const obj: Record<string, string> = {}
    for (const [id, color] of map) obj[id] = color
    localStorage.setItem(key, JSON.stringify(obj))
  } catch {
    // ignore
  }
}

/** 取行标题文本（统一 `querySelector`：会话行是直接子级，工作区行在 `.projectText` 内）。 */
function rowTitle(row: Element): string {
  const title = row.querySelector('[class*="title"]')
  return title !== null ? (title.textContent ?? '').trim() : ''
}

/** 会话标题 → 会话 id（跳过 blank）。 */
function buildSessionTitleMap(list: HestiaSessionListState): Map<string, string[]> {
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

/** 工作区标题 → workspaceId。 */
function buildWorkspaceTitleMap(list: HestiaWorkspaceListState): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const ws of list.items) {
    const title = ws.title.trim()
    if (title === '') continue
    const ids = map.get(title)
    if (ids === undefined) map.set(title, [ws.workspaceId])
    else ids.push(ws.workspaceId)
  }
  return map
}

/** 会话行 → 会话 id：优先复用粘性缓存；否则当前行用 aria-selected 精确定位，其余行要求标题唯一才匹配。 */
function resolveSessionId(row: Element, titleMap: Map<string, string[]>, currentId: string | undefined, validIds: ReadonlySet<string>): string | undefined {
  // 粘性缓存：React 原地更新（标题被 LLM 重写、fallback 截断等）时，优先用上次解析到的 id。
  const cached = row.getAttribute(ROW_ID_ATTR)
  if (cached !== null && cached !== '' && validIds.has(cached)) return cached

  let id: string | undefined
  if (row.getAttribute('aria-selected') === 'true' && currentId !== undefined) {
    id = currentId
  } else {
    const title = rowTitle(row)
    if (title !== '') {
      const ids = titleMap.get(title)
      if (ids !== undefined && ids.length === 1) id = ids[0]
    }
  }

  if (id !== undefined) row.setAttribute(ROW_ID_ATTR, id)
  else row.removeAttribute(ROW_ID_ATTR)
  return id
}

/** 工作区行 → workspaceId（未分组桶的本地化标题不在映射里，自然跳过）。 */
function resolveWorkspaceId(row: Element, titleMap: Map<string, string[]>): string | undefined {
  const title = rowTitle(row)
  if (title === '') return undefined
  const ids = titleMap.get(title)
  if (ids === undefined || ids.length !== 1) return undefined
  return ids[0]
}

/** 会话行是否为真实会话（非 blank）：blank 行没有 rowActions / time。 */
function isRealSessionRow(row: Element): boolean {
  return row.querySelector('[class*="rowActions"]') !== null
}

class ColorController {
  private readonly sessions: HestiaSessionsService
  private readonly workspaces: HestiaWorkspacesService | undefined
  private sessionColors: Map<string, string>
  private workspaceColors: Map<string, string>
  private observer: MutationObserver | null = null
  private unsubscribeSession: (() => void) | null = null
  private unsubscribeWorkspace: (() => void) | null = null
  private rafId: number | null = null
  private palette: HTMLElement | null = null
  private paletteTargetId: string | null = null
  private paletteTargetKind: ColorKind = 'session'
  private paletteClose: (() => void) | null = null

  constructor(sessions: HestiaSessionsService, workspaces: HestiaWorkspacesService | undefined) {
    this.sessions = sessions
    this.workspaces = workspaces
    this.sessionColors = loadColorMap(SESSION_COLOR_KEY)
    this.workspaceColors = loadColorMap(WORKSPACE_COLOR_KEY)
  }

  start(): void {
    this.unsubscribeSession = this.sessions.list.subscribe(() => this.schedule())
    if (this.workspaces !== undefined) {
      this.unsubscribeWorkspace = this.workspaces.list.subscribe(() => this.schedule())
    }
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
    this.unsubscribeSession?.()
    this.unsubscribeSession = null
    this.unsubscribeWorkspace?.()
    this.unsubscribeWorkspace = null
    this.closePalette()
    if (this.palette !== null) {
      this.palette.remove()
      this.palette = null
    }
    for (const btn of Array.from(document.querySelectorAll('.dshcolor-btn'))) btn.remove()
    for (const row of Array.from(document.querySelectorAll('[class*="sessionRow"], [class*="projectRow"]'))) {
      ;(row as HTMLElement).style.boxShadow = ''
    }
  }

  private schedule(): void {
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.refresh()
    })
  }

  private refresh(): void {
    const sessionList = this.sessions.list.getSnapshot()
    const sessionTitleMap = buildSessionTitleMap(sessionList)
    const currentId = sessionList.current
    const validSessionIds = new Set(sessionList.ids)
    const workspaceList = this.workspaces?.list.getSnapshot()
    const workspaceTitleMap = workspaceList !== undefined ? buildWorkspaceTitleMap(workspaceList) : new Map<string, string[]>()

    for (const row of Array.from(document.querySelectorAll('[class*="sessionRow"]'))) {
      this.syncSessionRow(row as HTMLElement, sessionTitleMap, currentId, validSessionIds)
    }
    for (const row of Array.from(document.querySelectorAll('[class*="projectRow"]'))) {
      this.syncWorkspaceRow(row as HTMLElement, workspaceTitleMap)
    }
  }

  private syncSessionRow(row: HTMLElement, titleMap: Map<string, string[]>, currentId: string | undefined, validIds: ReadonlySet<string>): void {
    if (!isRealSessionRow(row)) {
      row.style.boxShadow = ''
      return
    }
    const id = resolveSessionId(row, titleMap, currentId, validIds)
    if (id === undefined) {
      row.style.boxShadow = ''
      return
    }
    this.syncColor(row, id, 'session')
  }

  private syncWorkspaceRow(row: HTMLElement, titleMap: Map<string, string[]>): void {
    const id = resolveWorkspaceId(row, titleMap)
    if (id === undefined) {
      row.style.boxShadow = ''
      return
    }
    this.syncColor(row, id, 'workspace')
  }

  /** 为一行加色条 + 注入/更新颜色按钮。 */
  private syncColor(row: HTMLElement, id: string, kind: ColorKind): void {
    const color = this.colorMap(kind).get(id)
    // 左侧色条（inline box-shadow，不占布局；React 重渲染后由 observer 兜底恢复）
    row.style.boxShadow = color !== undefined ? 'inset 3px 0 0 0 ' + color : ''

    let btn = row.querySelector('.dshcolor-btn') as HTMLButtonElement | null
    if (btn === null) {
      btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'dshcolor-btn'
      btn.setAttribute('aria-label', '设置标识颜色')
      btn.addEventListener('click', (e) => this.onColorClick(e))
      row.appendChild(btn)
    }
    btn.setAttribute('data-hestia-color-id', id)
    btn.setAttribute('data-hestia-color-kind', kind)
    btn.classList.toggle('is-colored', color !== undefined)
    btn.style.setProperty('--hestia-color', color ?? 'transparent')
    btn.setAttribute('title', color !== undefined ? '更改 / 清除标识颜色' : '设置标识颜色')
  }

  private colorMap(kind: ColorKind): Map<string, string> {
    return kind === 'workspace' ? this.workspaceColors : this.sessionColors
  }

  private onColorClick(e: Event): void {
    e.preventDefault()
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement | null
    const id = target?.dataset.hestiaColorId
    const kind = target?.dataset.hestiaColorKind
    if (target === null || id === undefined || id === '') return
    this.openPalette(target, id, kind === 'workspace' ? 'workspace' : 'session')
  }

  /** 惰性创建调色板（全局单例，挂在 body 下）。 */
  private ensurePalette(): HTMLElement {
    if (this.palette !== null) return this.palette

    const palette = document.createElement('div')
    palette.className = 'dshcolor-palette'
    palette.setAttribute('role', 'dialog')
    palette.setAttribute('aria-label', '选择标识颜色')

    const swatches = document.createElement('div')
    swatches.className = 'dshcolor-swatches'
    for (const c of PRESET_COLORS) {
      const swatch = document.createElement('button')
      swatch.type = 'button'
      swatch.className = 'dshcolor-swatch'
      swatch.style.background = c.hex
      swatch.setAttribute('aria-label', '标识颜色 ' + c.label)
      swatch.setAttribute('title', c.label)
      swatch.addEventListener('click', (e) => {
        e.stopPropagation()
        if (this.paletteTargetId !== null) this.setColor(this.paletteTargetId, this.paletteTargetKind, c.hex)
        this.closePalette()
      })
      swatches.appendChild(swatch)
    }

    const clear = document.createElement('button')
    clear.type = 'button'
    clear.className = 'dshcolor-clear'
    clear.textContent = '清除'
    clear.setAttribute('title', '清除标识颜色')
    clear.addEventListener('click', (e) => {
      e.stopPropagation()
      if (this.paletteTargetId !== null) this.clearColor(this.paletteTargetId, this.paletteTargetKind)
      this.closePalette()
    })

    palette.appendChild(swatches)
    palette.appendChild(clear)
    document.body.appendChild(palette)
    this.palette = palette
    return palette
  }

  private openPalette(anchor: HTMLElement, id: string, kind: ColorKind): void {
    this.paletteTargetId = id
    this.paletteTargetKind = kind
    const palette = this.ensurePalette()
    const rect = anchor.getBoundingClientRect()
    const width = 8 * 20 + 7 * 4 + 56 + 20 // 8 swatches + gaps + clear + padding
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
    const top = Math.min(rect.bottom + 6, window.innerHeight - 44)
    palette.style.left = left + 'px'
    palette.style.top = top + 'px'
    palette.classList.add('dshcolor-open')

    const onDown = (e: MouseEvent) => {
      if (!palette.contains(e.target as Node) && e.target !== anchor && !anchor.contains(e.target as Node)) {
        this.closePalette()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closePalette()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    this.paletteClose = () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }

  private closePalette(): void {
    if (this.palette !== null) this.palette.classList.remove('dshcolor-open')
    this.paletteTargetId = null
    if (this.paletteClose !== null) {
      this.paletteClose()
      this.paletteClose = null
    }
  }

  private setColor(id: string, kind: ColorKind, hex: string): void {
    this.colorMap(kind).set(id, hex)
    saveColorMap(kind === 'workspace' ? WORKSPACE_COLOR_KEY : SESSION_COLOR_KEY, this.colorMap(kind))
    this.refresh()
  }

  private clearColor(id: string, kind: ColorKind): void {
    this.colorMap(kind).delete(id)
    saveColorMap(kind === 'workspace' ? WORKSPACE_COLOR_KEY : SESSION_COLOR_KEY, this.colorMap(kind))
    this.refresh()
  }
}

/** 装配入口：订阅 sessions.list + workspaces.list + 观察 DOM，注入标识颜色能力。 */
export function initColorMark(ctx: ClientContext): void {
  if (typeof document === 'undefined') return
  const sessions = ctx.get('sessions') as HestiaSessionsService | undefined
  if (sessions === undefined) return
  const workspaces = ctx.get('workspaces') as HestiaWorkspacesService | undefined
  const controller = new ColorController(sessions, workspaces)
  ctx.effect(() => {
    controller.start()
    return () => controller.dispose()
  })
}
