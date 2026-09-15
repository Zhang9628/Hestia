/**
 * 按标识颜色分组：在工作区「视图选项 → 分组方式」菜单里注入「按标识颜色」，
 * 选中后把侧栏会话列表强制切成「单列表」并按会话标识颜色归组，插入颜色组头。
 *
 * 思路（对应「标识颜色」能力的延伸）：
 * - 色表复用 color 模块的 `hestia-session-colors`（sessionId → '#hex'）。
 * - 开关持久化在 `hestia-color-grouping`；启用时记住原 groupBy 存
 *   `hestia-group-by-before-color`，停用时还原。
 * - 菜单注入：MutationObserver 监听 body，找到「单列表 / In one list」菜单项，
 *   在其后克隆插入一个「按标识颜色」项（文本定位，不依赖 shell 哈希类名）。
 * - 归组：强制 groupBy="flat"（flatList 无折叠、渲染全部会话行），在 flatList
 *   容器内把会话单元按色重排 + 插入组头；React 重渲染后由 observer 兜底再排。
 * - 与 pin 协调：开启时置 color-grouping 开关，pin 跳过重排（见 group/state.ts）。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { PRESET_COLORS, SESSION_COLOR_KEY } from '../color'
import { setColorGroupingActive } from './state'

// —— 最小结构视图（运行时由 shell 提供）——
interface HestiaSessionSummary {
  id: string
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
interface HestiaSessionsService {
  list: HestiaObservableSnapshot<HestiaSessionListState>
}
interface HestiaSlotsService {
  entries(key: string): Array<{ store?: unknown }>
  resolveStore(handle: unknown, scopeKey?: string): HestiaViewStoreInstance | undefined
}
interface HestiaViewStoreState {
  groupBy?: string
  sessionOrderByAccount?: Record<string, string[]>
  sessionUpdatedAtByAccount?: Record<string, Record<string, number>>
}
interface HestiaViewStoreInstance {
  getSnapshot(): HestiaViewStoreState
  store?: { update(mutator: (draft: HestiaViewStoreState) => void): void }
}

// —— 常量 ——
const GROUPING_KEY = 'hestia-color-grouping'
const PREV_GROUPBY_KEY = 'hestia-group-by-before-color'
const PIN_STORAGE_KEY = 'hestia-pinned-sessions'
const ROW_ID_ATTR = 'data-hestia-row-id'
const ITEM_CLASS = 'dshgroup-menu-item'
const HEADER_CLASS = 'dshgroup-header'
/** 注入 UI 文案（与 pin/color 模块一致，中文硬编码）。 */
const ITEM_LABEL = '按标识颜色'
const UNCOLORED_LABEL = '未上色'

/** 一个已解析的会话单元：flatList 的直接子元素 + 其中的会话行。 */
interface Unit {
  el: HTMLElement
  row: HTMLElement
  id: string
  pinned: boolean
}
interface ColorGroup {
  color: string | null
  label: string
  units: Unit[]
}

function loadMap(key: string): Map<string, string> {
  const map = new Map<string, string>()
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [id, color] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof color === 'string' && color.startsWith('#')) map.set(id, color)
        }
      }
    }
  } catch {
    // ignore
  }
  return map
}

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

/** 会话行标题（行内 `[class*="title"]` 子元素）。 */
function rowTitle(row: Element): string {
  const title = row.querySelector('[class*="title"]')
  return title !== null ? (title.textContent ?? '').trim() : ''
}

function buildTitleMap(list: HestiaSessionListState): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const id of list.ids) {
    const s = list.byId[id]
    if (s === undefined || s.blank) continue
    const title = s.displayTitle.trim()
    if (title === '') continue
    const ids = map.get(title)
    if (ids === undefined) map.set(title, [id])
    else ids.push(id)
  }
  return map
}

/** 从 slots 服务解析工作区视图 store（root scope）。失败返回 null。 */
function findStoreInstance(slots: HestiaSlotsService | undefined): HestiaViewStoreInstance | null {
  if (slots === undefined) return null
  try {
    const entries = slots.entries('sidebar.workspaces')
    if (!Array.isArray(entries)) return null
    for (const entry of entries) {
      const handle = entry?.store
      if (handle === undefined || handle === null) continue
      const instance = slots.resolveStore(handle, undefined)
      if (instance !== undefined && typeof instance.getSnapshot === 'function') return instance
    }
  } catch {
    // ignore
  }
  return null
}

class ColorGroupingController {
  private readonly sessions: HestiaSessionsService
  private readonly slots: HestiaSlotsService | undefined
  private enabled: boolean
  private prevGroupBy: string
  private observer: MutationObserver | null = null
  private unsubscribe: (() => void) | null = null
  private rafId: number | null = null
  private storeInstance: HestiaViewStoreInstance | null = null
  private lastSignature: string | null = null

  constructor(sessions: HestiaSessionsService, slots: HestiaSlotsService | undefined) {
    this.sessions = sessions
    this.slots = slots
    this.enabled = localStorage.getItem(GROUPING_KEY) === '1'
    this.prevGroupBy = localStorage.getItem(PREV_GROUPBY_KEY) ?? 'workspace'
    setColorGroupingActive(this.enabled)
  }

  start(): void {
    this.unsubscribe = this.sessions.list.subscribe(() => this.schedule())
    // 启动时若处于开启态，立即切到单列表（恢复上次会话的分组态）。
    if (this.enabled) this.ensureFlat()
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
    this.cleanupHeaders()
  }

  private schedule(): void {
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.refresh()
    })
  }

  private refresh(): void {
    this.syncMenuItem()
    if (this.enabled) {
      this.ensureFlat()
      this.syncGrouping()
    } else {
      this.cleanupHeaders()
    }
  }

  // —— store 访问 ——
  private resolveStore(): HestiaViewStoreInstance | null {
    if (this.storeInstance !== null) return this.storeInstance
    // 只缓存「非空」实例：工作区视图 store 可能晚于本插件 apply 才注册，
    // 首次解析失败时后续 refresh 要能重试，而不是像 pin 那样缓存 null。
    const found = findStoreInstance(this.slots)
    if (found !== null) this.storeInstance = found
    return found
  }

  private currentGroupBy(): string {
    return this.resolveStore()?.getSnapshot().groupBy ?? 'workspace'
  }

  private setGroupBy(value: string): void {
    const store = this.resolveStore()
    if (store === null || typeof store.store?.update !== 'function') return
    store.store.update((draft) => {
      draft.groupBy = value
    })
  }

  /** 强制单列表（颜色分组需要 flatList 全量渲染、无折叠）。 */
  private ensureFlat(): void {
    if (this.currentGroupBy() !== 'flat') this.setGroupBy('flat')
  }

  // —— 菜单注入 ——
  /** 找到「单列表 / In one list」菜单项（文本包含匹配，不依赖 shell 哈希类名）。 */
  private findFlatItem(): HTMLElement | null {
    for (const el of Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], button'))) {
      const text = (el.textContent ?? '').trim()
      if (text.includes('单列表') || text.includes('In one list')) return el as HTMLElement
    }
    return null
  }

  private createMenuItem(): HTMLElement {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = ITEM_CLASS
    item.setAttribute('role', 'menuitem')
    item.setAttribute('aria-checked', String(this.enabled))

    const dot = document.createElement('span')
    dot.className = 'dshgroup-dot'
    const label = document.createElement('span')
    label.className = 'dshgroup-name'
    label.textContent = ITEM_LABEL
    const check = document.createElement('span')
    check.className = 'dshgroup-check'
    check.textContent = '✓'
    item.appendChild(dot)
    item.appendChild(label)
    item.appendChild(check)

    item.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.toggle()
    })
    return item
  }

  private syncMenuItem(): void {
    const flatItem = this.findFlatItem()
    if (flatItem === null) return
    const parent = flatItem.parentElement
    if (parent === null) return

    let myItem = parent.querySelector('.' + ITEM_CLASS) as HTMLElement | null
    if (myItem === null) {
      myItem = this.createMenuItem()
      // 克隆兄弟项的 className 以套用 shell 菜单项样式（哈希类名不可预知）。
      const cls = (flatItem.getAttribute('class') ?? '').trim()
      if (cls !== '') myItem.className = cls + ' ' + ITEM_CLASS
      parent.insertBefore(myItem, flatItem.nextSibling)
    }
    myItem.classList.toggle('is-active', this.enabled)
    myItem.setAttribute('aria-checked', String(this.enabled))
  }

  private toggle(): void {
    this.enabled = !this.enabled
    try {
      localStorage.setItem(GROUPING_KEY, this.enabled ? '1' : '')
    } catch {
      // ignore
    }
    setColorGroupingActive(this.enabled)

    if (this.enabled) {
      // 记住启用前的 groupBy（若本就是 flat 则保留旧值），停用时据此还原。
      const current = this.currentGroupBy()
      if (current !== 'flat') {
        this.prevGroupBy = current
        try {
          localStorage.setItem(PREV_GROUPBY_KEY, current)
        } catch {
          // ignore
        }
      }
      this.ensureFlat()
    } else {
      this.setGroupBy(this.prevGroupBy === 'flat' ? 'workspace' : this.prevGroupBy)
      this.cleanupHeaders()
      this.lastSignature = null
    }
    this.refresh()
    this.closeMenu()
  }

  /** 关闭 shell 菜单：派发外部 pointerdown/mousedown + Escape（菜单对任一都能关闭）。 */
  private closeMenu(): void {
    try {
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    } catch {
      // ignore
    }
  }

  // —— 归组 ——
  private flatContainer(): HTMLElement | null {
    const el = document.querySelector('[class*="flatList"]')
    return el as HTMLElement | null
  }

  private sessionRowOf(el: Element): HTMLElement | null {
    if (el.matches('[class*="sessionRow"]')) return el as HTMLElement
    const row = el.querySelector('[class*="sessionRow"]')
    return row !== null ? (row as HTMLElement) : null
  }

  /** 解析会话行 → id：优先复用粘性缓存，否则按标题映射（要求标题唯一）。 */
  private resolveId(row: HTMLElement, titleMap: Map<string, string[]>, currentId: string | undefined, validIds: ReadonlySet<string>): string | undefined {
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
    return id
  }

  private collectUnits(container: HTMLElement, titleMap: Map<string, string[]>, currentId: string | undefined, validIds: ReadonlySet<string>, pinned: ReadonlySet<string>): Unit[] {
    const units: Unit[] = []
    for (const child of Array.from(container.children)) {
      if (child.classList.contains(HEADER_CLASS)) continue
      const row = this.sessionRowOf(child)
      if (row === null) continue
      const id = this.resolveId(row, titleMap, currentId, validIds)
      if (id === undefined) continue
      units.push({ el: child as HTMLElement, row, id, pinned: pinned.has(id) })
    }
    return units
  }

  private buildGroups(units: Unit[], colorMap: Map<string, string>, uncoloredLabel: string): ColorGroup[] {
    const buckets = new Map<string | null, Unit[]>()
    for (const u of units) {
      const color = colorMap.get(u.id) ?? null
      const list = buckets.get(color)
      if (list === undefined) buckets.set(color, [u])
      else list.push(u)
    }
    const groups: ColorGroup[] = []
    for (const preset of PRESET_COLORS) {
      const list = buckets.get(preset.hex)
      if (list === undefined) continue
      groups.push({ color: preset.hex, label: preset.label, units: sortWithin(list) })
    }
    const stray = buckets.get(null)
    if (stray !== undefined) groups.push({ color: null, label: uncoloredLabel, units: sortWithin(stray) })
    return groups
  }

  private makeHeader(group: ColorGroup): HTMLElement {
    const header = document.createElement('div')
    header.className = HEADER_CLASS
    header.style.setProperty('--dshgroup-color', group.color ?? '#6b7280')
    const dot = document.createElement('span')
    dot.className = 'dshgroup-dot'
    const name = document.createElement('span')
    name.className = 'dshgroup-name'
    name.textContent = group.label
    const count = document.createElement('span')
    count.className = 'dshgroup-count'
    count.textContent = String(group.units.length)
    header.appendChild(dot)
    header.appendChild(name)
    header.appendChild(count)
    return header
  }

  private syncGrouping(): void {
    const container = this.flatContainer()
    if (container === null) return
    const list = this.sessions.list.getSnapshot()
    const titleMap = buildTitleMap(list)
    const validIds = new Set(list.ids)
    const pinned = loadPinned()
    const colorMap = loadMap(SESSION_COLOR_KEY)

    const units = this.collectUnits(container, titleMap, list.current, validIds, pinned)
    const groups = this.buildGroups(units, colorMap, UNCOLORED_LABEL)

    const signature = groups.map((g) => g.color + ':' + g.units.map((u) => u.id).join(',')).join('|')
    if (signature === this.lastSignature) return
    this.lastSignature = signature

    // 移除旧组头，再按组顺序把组头 + 单元插到容器末尾的锚点前。
    for (const h of Array.from(container.querySelectorAll('.' + HEADER_CLASS))) h.remove()
    const marker = document.createComment('dshgroup')
    container.appendChild(marker)
    for (const group of groups) {
      container.insertBefore(this.makeHeader(group), marker)
      for (const u of group.units) container.insertBefore(u.el, marker)
    }
    marker.remove()
  }

  private cleanupHeaders(): void {
    for (const h of Array.from(document.querySelectorAll('.' + HEADER_CLASS))) h.remove()
  }
}

/** 组内排序：置顶优先（保持原相对顺序），其余保持原相对顺序（即 recency 顺序）。 */
function sortWithin(units: Unit[]): Unit[] {
  const pinnedUnits = units.filter((u) => u.pinned)
  if (pinnedUnits.length === 0) return units
  return pinnedUnits.concat(units.filter((u) => !u.pinned))
}

/** 装配入口：订阅 sessions.list + 观察 DOM，注入「按标识颜色」分组能力。 */
export function initColorGrouping(ctx: ClientContext): void {
  if (typeof document === 'undefined') return
  const sessions = ctx.get('sessions') as HestiaSessionsService | undefined
  if (sessions === undefined) return
  const slots = ctx.get('slots') as HestiaSlotsService | undefined
  const controller = new ColorGroupingController(sessions, slots)
  ctx.effect(() => {
    controller.start()
    return () => controller.dispose()
  })
}
