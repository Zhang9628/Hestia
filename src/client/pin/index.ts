/**
 * session 置顶/pin：列表增强（纯 client，无 host 半）。
 *
 * 思路（对应架构路线「存 pin 集合，列表排序前置」）：
 * - pin 集合存 localStorage（`hestia-pinned-sessions`，JSON 字符串数组）。
 * - 订阅 client `sessions.list` 快照，按 `displayTitle` 建立「标题 → sessionId」映射。
 * - MutationObserver 监听会话列表 DOM，给每行注入置顶按钮（hover 显示；已置顶常显）。
 * - 在每个容纳会话行的容器内，把已置顶的行用 DOM 重排移到最前；
 *   React 重渲染会恢复其自身顺序，由 observer 兜底再排一遍。
 *
 * 折叠场景（工作区会话超过 5 条时，React 只渲染 `slice(0, 5)`，其余藏在
 * 「展开其余 x 个会话」按钮后）：DOM 重排只能移动已渲染的行，藏在折叠尾部的
 * 置顶会话不在 DOM 里，因此仅靠 DOM 重排无法把它们提到最前。为此，额外把
 * 「置顶优先」顺序写回工作区视图 store 的 `sessionOrderByAccount`（这也是侧栏
 * 决定渲染顺序、进而决定折叠可见切片的唯一权威），让 React 在折叠态也按置顶
 * 优先渲染。DOM 重排仍保留：它覆盖 flat 列表、以及 store 被「最近更新」排序
 * 短暂抢回顺序的间隙。
 *
 * 逆向结论（见 @deepseek-ai/dsh-client-ui-workspace 源码）：
 * - 会话行 = `[class*="sessionRow"]`（CSS Modules 哈希前缀 + 语义类名），
 *   role=treeitem，无 data-session-id；标题文本在行内 `[class*="title"]` 子元素。
 * - 行标题 = `SessionSummary.displayTitle`（durable title → cwd 目录名 → 原始 id）。
 * - 行按钮追加为「最后一个子元素」，避免 React 按索引 diff 时把注入节点顶掉。
 * - 工作区视图 store 通过 `slots.entries('sidebar.workspaces')` 上的 store handle
 *   解析（`slots.resolveStore`），这是运行时才有的内部 API，故防御式访问，失败
 *   时静默退回纯 DOM 重排。
 */
import type { ClientContext } from '../context'
import { colorGroupingActive } from '../group/state'

/** 会话列表快照的最小结构视图（运行时由 shell 的 sessions 服务提供）。 */
interface HestiaSessionSummary {
  id: string
  title?: string
  displayTitle: string
  blank: boolean
  updatedAt: number
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

const PIN_STORAGE_KEY = 'hestia-pinned-sessions'
/** 粘性解析：解析过的会话 id 暂存在行上，标题被重写/截断时仍可复用（pin 与 color 共用）。 */
const ROW_ID_ATTR = 'data-hestia-row-id'

/** 置顶图标（lucide pin，2px 描边；置顶态给「头」上色）。 */
const PIN_SVG =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 17v5"/>' +
  '<path data-hestia-head d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>' +
  '</svg>'

function loadPinned(): Set<string> {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return new Set(parsed.filter((x): x is string => typeof x === 'string'))
    }
  } catch {
    // ignore
  }
  return new Set()
}

function savePinned(set: Set<string>): void {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // ignore
  }
}

/** 判断一个 DOM 元素是否是会话行。 */
function isSessionRow(el: Element): boolean {
  return el.matches('[class*="sessionRow"]')
}

/** 取会话行的标题文本（行内 `[class*="title"]` 子元素）。 */
function rowTitle(row: Element): string {
  for (const child of Array.from(row.children)) {
    if (typeof child.className === 'string' && child.className.split(/\s+/).some((c) => c.includes('title'))) {
      return (child.textContent ?? '').trim()
    }
  }
  return ''
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

/** 会话行 → id：优先复用粘性缓存；否则当前行用 aria-selected 精确定位，其余行要求标题唯一才匹配。 */
function resolveRowId(row: Element, titleMap: Map<string, string[]>, currentId: string | undefined, validIds: ReadonlySet<string>): string | undefined {
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

/** 会话行是否可置顶：blank 行没有 rowActions / time，跳过。 */
function isPinnableRow(row: Element): boolean {
  return row.querySelector('[class*="rowActions"]') !== null
}

class PinController {
  private readonly sessions: HestiaSessionsService
  private pinned: Set<string>
  private observer: MutationObserver | null = null
  private unsubscribe: (() => void) | null = null
  private rafId: number | null = null

  constructor(sessions: HestiaSessionsService) {
    this.sessions = sessions
    this.pinned = loadPinned()
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
    // 尽力清理注入的按钮与标记（React 下次渲染也会自行清理）。
    for (const btn of Array.from(document.querySelectorAll('.dshpin-btn'))) btn.remove()
    for (const row of Array.from(document.querySelectorAll('[data-hestia-pinned]'))) row.removeAttribute('data-hestia-pinned')
  }

  private schedule(): void {
    // 合并（而非防抖）：会话执行时对话区每个 token 都会触发 DOM 变动，若用「重置定时器」
    // 的防抖，refresh 会被持续刷新的定时器饿死、永远不执行；用 rAF 合并可保证每帧最多
    // 跑一次 refresh，流式期间也能及时应用置顶状态。
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.refresh()
    })
  }

  private refresh(): void {
    const list = this.sessions.list.getSnapshot()
    const titleMap = buildTitleMap(list)
    const currentId = list.current
    const validIds = new Set(list.ids)

    for (const row of Array.from(document.querySelectorAll('[class*="sessionRow"]'))) {
      this.syncRow(row, titleMap, currentId, validIds)
    }

    // 按标识颜色分组开启时，重排交给 group 模块（否则两者互相打乱对方顺序）。
    if (colorGroupingActive()) return

    this.reorderContainers()
  }

  /** 为单行注入/更新置顶按钮与置顶标记。 */
  private syncRow(row: Element, titleMap: Map<string, string[]>, currentId: string | undefined, validIds: ReadonlySet<string>): void {
    if (!isPinnableRow(row)) {
      row.removeAttribute('data-hestia-pinned')
      return
    }
    const id = resolveRowId(row, titleMap, currentId, validIds)
    if (id === undefined) {
      row.removeAttribute('data-hestia-pinned')
      return
    }
    const pinned = this.pinned.has(id)
    if (pinned) row.setAttribute('data-hestia-pinned', 'true')
    else row.removeAttribute('data-hestia-pinned')

    let btn = row.querySelector('.dshpin-btn') as HTMLButtonElement | null
    if (btn === null) {
      btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'dshpin-btn'
      btn.setAttribute('aria-label', '置顶会话')
      btn.innerHTML = PIN_SVG
      btn.addEventListener('click', (e) => this.onPinClick(e))
      // 稳定顺序：置顶按钮固定排在颜色按钮之前（否则两个控制器运行时机不同会导致左右乱序）。
      const colorBtn = row.querySelector('.dshcolor-btn')
      if (colorBtn !== null) row.insertBefore(btn, colorBtn)
      else row.appendChild(btn) // 追加为最后一个子元素，避免 React 按索引 diff 顶掉注入节点
    }
    btn.setAttribute('data-hestia-session-id', id)
    btn.setAttribute('aria-pressed', String(pinned))
    btn.classList.toggle('is-pinned', pinned)
    btn.setAttribute('title', pinned ? '取消置顶' : '置顶会话')
  }

  private onPinClick(e: Event): void {
    e.preventDefault()
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement | null
    const id = target?.dataset.hestiaSessionId
    if (id === undefined || id === '') return
    if (this.pinned.has(id)) this.pinned.delete(id)
    else this.pinned.add(id)
    savePinned(this.pinned)
    this.refresh()
  }

  /** 找出所有容纳会话行的列表容器（分组的 groupSection / 平铺的 flatList）。 */
  private reorderContainers(): void {
    const containers = new Set<Element>()
    for (const row of Array.from(document.querySelectorAll('[class*="sessionRow"]'))) {
      const container = this.listContainerOf(row)
      if (container !== null) containers.add(container)
    }
    for (const container of containers) this.reorderIn(container)
  }

  /**
   * 会话行被 HoverCard 包了一层 wrapper（如 `span._root_*`），真正的排序容器是 wrapper 的父级。
   * 兼容「无额外包装」的情况：若父级本身就是含多行的容器，则直接用父级。
   */
  private listContainerOf(row: Element): Element | null {
    const wrapper = row.parentElement
    if (wrapper === null) return null
    const directRows = Array.from(wrapper.children).filter((c) => isSessionRow(c)).length
    return directRows > 1 ? wrapper : wrapper.parentElement
  }

  /** 容器内一个可重排单元：要么是会话行本身，要么是包着会话行的 wrapper。 */
  private isReorderable(el: Element): boolean {
    return isSessionRow(el) || el.querySelector('[class*="sessionRow"]') !== null
  }

  /** 单元是否含已置顶会话行。 */
  private isPinnedUnit(el: Element): boolean {
    return el.matches('[data-hestia-pinned="true"]') || el.querySelector('[data-hestia-pinned="true"]') !== null
  }

  /** 在单个容器内，把含已置顶会话行的单元排到最前（其余保持原相对顺序）。 */
  private reorderIn(container: Element): void {
    const items = Array.from(container.children).filter((el) => this.isReorderable(el))
    if (items.length < 2) return
    const first = items[0]
    if (first === undefined) return

    const pinnedItems = items.filter((el) => this.isPinnedUnit(el))
    if (pinnedItems.length === 0 || pinnedItems.length === items.length) return
    const desired = pinnedItems.concat(items.filter((el) => !this.isPinnedUnit(el)))
    if (desired.every((el, i) => el === items[i])) return

    // 用注释锚点保持非会话兄弟节点（项目头行在前 / 溢出按钮在后）的位置不动。
    const marker = document.createComment('hestia-pin')
    container.insertBefore(marker, first)
    for (const el of desired) container.insertBefore(el, marker)
    marker.remove()
  }
}

/** 装配入口：订阅 sessions.list + 观察 DOM，注入置顶能力（纯 DOM 重排，覆盖未折叠的会话列表）。 */
export function initSessionPin(ctx: ClientContext): void {
  if (typeof document === 'undefined') return
  const sessions = ctx.get('sessions') as HestiaSessionsService | undefined
  if (sessions === undefined) return
  const controller = new PinController(sessions)
  ctx.effect(() => {
    controller.start()
    return () => controller.dispose()
  })
}
