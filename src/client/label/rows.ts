/**
 * 侧栏会话列表的 DOM / 快照最小视图（label 模块内部复用）。
 *
 * 逆向结论（见 @deepseek-ai/dsh-client-ui-workspace 的 Rows / WorkspaceBrowser）：
 * - 会话行 = `<div class="…sessionRow">`（CSS Modules 哈希前缀 + 语义类名），
 *   role="treeitem"、`aria-selected` 标记当前会话，**没有 data-session-id**；
 *   children 顺序：`span.slot`（状态灯，可缺省）→ `span.title` → 时间 `span.time`
 *   → `span.rowActions`（hover 显示的 ⋯ 菜单）。
 * - 行标题文本 = `SessionSummary.displayTitle`；标题元素本身必须保持原样
 *   （pin / color / group 都靠「标题文本 → sessionId」定位），所以标签节点只能
 *   插在标题元素**之前**，不能塞进标题元素内部。
 * - 工作区（分组）容器 = `[class*="groupSection"]`，平铺容器 = `[class*="flatList"]`；
 *   每行外包一层 HoverCard 锚点，因此「行 → 排序容器」要向上找两层。
 */

/** 会话列表快照的最小结构视图（运行时由 shell 的 sessions 服务提供）。 */
export interface HestiaSessionSummary {
  id: string
  displayTitle: string
  blank: boolean
}
export interface HestiaSessionListState {
  ids: string[]
  byId: Record<string, HestiaSessionSummary>
  current?: string
}
/** 工作区列表快照的最小结构视图。 */
export interface HestiaWorkspaceItem {
  workspaceId: string
  sessionIds: readonly string[]
}
export interface HestiaWorkspaceListState {
  items: readonly HestiaWorkspaceItem[]
}
export interface HestiaObservableSnapshot<T> {
  getSnapshot(): T
  subscribe(fn: () => void): () => void
}
export interface HestiaSessionsService {
  list: HestiaObservableSnapshot<HestiaSessionListState>
}
export interface HestiaWorkspacesService {
  list: HestiaObservableSnapshot<HestiaWorkspaceListState>
  insertSessionBefore(workspaceId: string, sessionId: string, beforeSessionId?: string): Promise<unknown>
}

/** 粘性解析：解析过的会话 id 暂存在行上，标题被 LLM 重写/截断时仍可复用（pin / color / label 共用）。 */
export const ROW_ID_ATTR = 'data-hestia-row-id'

export function isSessionRow(el: Element): boolean {
  return el.matches('[class*="sessionRow"]')
}

/** 会话行是否真实会话（blank 行没有 rowActions）。 */
export function isRealSessionRow(row: Element): boolean {
  return row.querySelector('[class*="rowActions"]') !== null
}

/** 行标题元素：行内 class 含 `title` 的那个子元素（不可往里塞节点）。 */
export function titleElementOf(row: Element): HTMLElement | null {
  for (const child of Array.from(row.children)) {
    const cls = child.getAttribute('class')
    if (cls !== null && cls.split(/\s+/).some((c) => c.includes('title'))) return child as HTMLElement
  }
  return null
}

/** 行标题文本（用于「标题 → sessionId」映射）。 */
export function rowTitle(row: Element): string {
  const title = titleElementOf(row)
  return title !== null ? (title.textContent ?? '').trim() : ''
}

/** 标题 → 会话 id（跳过 blank 会话）。 */
export function buildTitleMap(list: HestiaSessionListState): Map<string, string[]> {
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

/** 会话行 → 会话 id：优先复用粘性缓存；否则当前行用 aria-selected 定位，其余要求标题唯一。 */
export function resolveRowId(
  row: Element,
  titleMap: Map<string, string[]>,
  currentId: string | undefined,
  validIds: ReadonlySet<string>,
): string | undefined {
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

/** 当前文档里的全部会话行元素。 */
export function sessionRowElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[class*="sessionRow"]')) as HTMLElement[]
}

/**
 * 行所在的排序容器：行被 HoverCard 包了一层，真正的容器是 wrapper 的父级；
 * 若 wrapper 本身就含多行，则直接用 wrapper。
 */
export function listContainerOf(row: Element): Element | null {
  const wrapper = row.parentElement
  if (wrapper === null) return null
  const directRows = Array.from(wrapper.children).filter((child) => isSessionRow(child)).length
  return directRows > 1 ? wrapper : wrapper.parentElement
}

/** 容器内一个可重排单元：会话行本身，或包着会话行的 wrapper。 */
export function reorderableElement(el: Element): HTMLElement | null {
  if (isSessionRow(el)) return el as HTMLElement
  if (el.querySelector('[class*="sessionRow"]') !== null) return el as HTMLElement
  return null
}