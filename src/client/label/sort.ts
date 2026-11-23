/**
 * 按标签排序：在「视图选项 → 排序方式」里注入「按标签」，选中后把工作区内的
 * 会话按标签重排（即分组方式「按工作区」下的二级排序）。
 *
 * 为什么要写回 host：工作区组里 React 只按 `workspace.sessionIds`（host 持久顺序）
 * 渲染前 5 条（COLLAPSED_SESSION_LIMIT），DOM 重排只能移动已渲染的行——排在后面的
 * 标签会话根本不在 DOM 里。因此「完全正确」必须用官方
 * `workspaces.insertSessionBefore` 把期望顺序写回 host；DOM 重排只做即时反馈。
 *
 * 安全策略：
 * - 开启时把每个工作区「开启前」的顺序备份到 `hestia-label-sort-backup`；
 *   关闭（或改选其它排序方式）时按备份还原，避免永久打乱用户手工顺序。
 * - 与「按标识颜色分组」互斥（对方接管 flatList 的重排），开启时跳过。
 * - 与 pin 通过 `label/state.ts` 协调：开启时 pin 不再重排，置顶优先由本模块的
 *   比较键保证（置顶 → 有标签 → 标签 locale → 原相对顺序）。
 */
import type { ClientContext } from '../context'
import { colorGroupingActive } from '../group/state'
import { setLabelSortActive } from './state'
import { loadPinnedSessions, loadSessionLabels, sortSessionIds } from './store'
import {
  type HestiaSessionsService,
  type HestiaWorkspacesService,
  buildTitleMap,
  isSessionRow,
  listContainerOf,
  resolveRowId,
  sessionRowElements,
} from './rows'

/** 开关持久化：'1' = 按标签排序。 */
const SORT_KEY = 'hestia-label-sort'
/** 开启前的 host 顺序备份（关掉时还原）。 */
const BACKUP_KEY = 'hestia-label-sort-backup'
const ITEM_CLASS = 'dshlabel-sort-item'
const ITEM_LABEL = '按标签'
/** shell 原生排序项文案：用户改选它们时自动关掉按标签排序。 */
const ORDER_ITEM_TEXTS = ['手动排序', '最近更新', 'Manual', 'Last updated']

function loadBackup(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string[]> = {}
    for (const [wsId, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(ids)) out[wsId] = ids.filter((x): x is string => typeof x === 'string')
    }
    return out
  } catch {
    return {}
  }
}

function saveBackup(backup: Record<string, string[]>): void {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
  } catch {
    // ignore
  }
}

class LabelSortController {
  private readonly sessions: HestiaSessionsService
  private readonly workspaces: HestiaWorkspacesService | undefined
  private enabled: boolean
  private backup: Record<string, string[]> = loadBackup()
  private observer: MutationObserver | null = null
  private unsubscribeSessions: (() => void) | null = null
  private unsubscribeWorkspaces: (() => void) | null = null
  private rafId: number | null = null
  private itemEl: HTMLElement | null = null
  private writing = new Set<string>()
  /** 工作区冷却截止时间：成功写入后短暂静默，失败 / 不收敛则逐步拉长重试间隔。 */
  private cooldownUntil = new Map<string, number>()
  /** 连续「写了但没收敛」的次数，用于止损（避免每帧都发 RPC）。 */
  private attempts = new Map<string, number>()

  constructor(sessions: HestiaSessionsService, workspaces: HestiaWorkspacesService | undefined) {
    this.sessions = sessions
    this.workspaces = workspaces
    this.enabled = localStorage.getItem(SORT_KEY) === '1'
    setLabelSortActive(this.enabled)
  }

  start(): void {
    this.unsubscribeSessions = this.sessions.list.subscribe(() => this.schedule())
    if (this.workspaces !== undefined) {
      this.unsubscribeWorkspaces = this.workspaces.list.subscribe(() => this.schedule())
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
    this.unsubscribeSessions?.()
    this.unsubscribeSessions = null
    this.unsubscribeWorkspaces?.()
    this.unsubscribeWorkspaces = null
    setLabelSortActive(false)
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
    if (!this.enabled) return
    // 「按标识颜色分组」接管 flatList 的重排时让位，避免两边互相打乱。
    if (colorGroupingActive()) return
    this.sortDom()
    this.persistOrder()
  }

  // —— 菜单注入 ——

  /** shell 的原生排序项（文本精确匹配，避免命中我们自己的项）。 */
  private findMenuItem(match: string): HTMLElement | null {
    for (const el of Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], button'))) {
      if (el.classList.contains(ITEM_CLASS)) continue
      if ((el.textContent ?? '').trim() === match) return el as HTMLElement
    }
    return null
  }

  private findOrderAnchor(): HTMLElement | null {
    for (const text of ORDER_ITEM_TEXTS) {
      const el = this.findMenuItem(text)
      if (el !== null) return el
    }
    return null
  }

  private createMenuItem(shellItem: HTMLElement): HTMLElement {
    const item = document.createElement('button')
    item.type = 'button'
    // 克隆 shell 菜单项样式；剔除选中态类名，避免我们这项看起来「已被选中」。
    // （Menu 的 CSS Module 在不同构建里可能是空 stub，所以 dshlabel-sort-item 自身
    //  也在 CSS 里写了一份独立样式，克隆类名只是「更像原生菜单项」的增强。）
    const shellClass = (shellItem.getAttribute('class') ?? '')
      .split(/\s+/)
      .filter((token) => token !== '' && !/select|active|checked/i.test(token))
      .join(' ')
    item.className = (shellClass !== '' ? shellClass + ' ' : '') + ITEM_CLASS
    item.setAttribute('role', 'menuitem')
    item.setAttribute('aria-checked', String(this.enabled))

    const name = document.createElement('span')
    name.className = 'dshlabel-sort-name'
    name.textContent = ITEM_LABEL
    const check = document.createElement('span')
    check.className = 'dshlabel-sort-check'
    check.textContent = '✓'
    item.appendChild(name)
    item.appendChild(check)

    item.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.setEnabled(!this.enabled)
      this.closeMenu()
    })
    return item
  }

  /** 用户改选 shell 原生排序项时，自动关掉按标签排序（两项不能同时生效）。 */
  private bindMenu(parent: HTMLElement): void {
    if (parent.dataset.hestiaLabelSortBound === '1') return
    parent.dataset.hestiaLabelSortBound = '1'
    parent.addEventListener('click', (e) => {
      const target = e.target
      if (!(target instanceof Element)) return
      const item = target.closest('[role="menuitem"], [role="option"], button')
      if (item === null || item.classList.contains(ITEM_CLASS)) return
      const text = (item.textContent ?? '').trim()
      if (ORDER_ITEM_TEXTS.some((known) => text === known) && this.enabled) this.setEnabled(false)
    }, true)
  }

  /** 菜单列表容器（`role="menu"`），用于挂载注入项与事件代理。 */
  private menuContainerOf(anchor: HTMLElement): HTMLElement | null {
    const menu = anchor.closest('[role="menu"]')
    if (menu !== null) return menu as HTMLElement
    const wrap = anchor.parentElement
    return wrap !== null ? wrap.parentElement : null
  }

  private syncMenuItem(): void {
    const anchor = this.findOrderAnchor()
    if (anchor === null) {
      this.itemEl = null
      return
    }
    const container = this.menuContainerOf(anchor)
    if (container === null) return
    this.bindMenu(container)

    let myItem = this.itemEl
    if (myItem === null || !myItem.isConnected || myItem.closest('[role="menu"]') !== container) {
      const sibling = this.findMenuItem('手动排序') ?? this.findMenuItem('Manual') ?? anchor
      myItem = this.createMenuItem(sibling)
      this.insertItem(anchor, myItem)
      this.itemEl = myItem
    }
    myItem.classList.toggle('is-active', this.enabled)
    myItem.setAttribute('aria-checked', String(this.enabled))
    myItem.setAttribute('title', this.enabled ? '按标签排序（点击关闭）' : '按标签排序（工作区内二级排序）')
  }

  /** 插到 shell 排序项之后：菜单项有 itemWrap 包裹时克隆一层 wrapper，保持间距一致。 */
  private insertItem(anchor: HTMLElement, item: HTMLElement): void {
    const wrap = anchor.parentElement
    if (wrap === null) return
    if (wrap.getAttribute('role') === 'menu') {
      wrap.insertBefore(item, anchor.nextSibling)
      return
    }
    const container = wrap.parentElement
    if (container === null) return
    const myWrap = document.createElement('div')
    myWrap.className = wrap.getAttribute('class') ?? ''
    myWrap.appendChild(item)
    container.insertBefore(myWrap, wrap.nextSibling)
  }

  /** 关闭 shell 菜单：外部 pointerdown / mousedown / Escape 任一都能关。 */
  private closeMenu(): void {
    try {
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    } catch {
      // ignore
    }
  }

  // —— 开关 ——

  private setEnabled(value: boolean): void {
    if (this.enabled === value) return
    this.enabled = value
    try {
      localStorage.setItem(SORT_KEY, value ? '1' : '')
    } catch {
      // ignore
    }
    setLabelSortActive(value)

    if (value) {
      this.captureBackup()
    } else {
      void this.restoreOrder()
    }
    this.refresh()
  }

  /**
   * 记录「开启前」每个工作区的 host 顺序。只记第一次：之后标签变化引起的重排
   * 不会覆盖它，保证关掉排序能回到用户手工排好的顺序。
   */
  private captureBackup(): void {
    const ws = this.workspaces
    if (ws === undefined) return
    let changed = false
    for (const item of ws.list.getSnapshot().items) {
      if (this.backup[item.workspaceId] !== undefined) continue
      this.backup[item.workspaceId] = Array.from(item.sessionIds)
      changed = true
    }
    if (changed) saveBackup(this.backup)
  }

  private async restoreOrder(): Promise<void> {
    const ws = this.workspaces
    const backup = this.backup
    this.backup = {}
    saveBackup({})
    if (ws === undefined) return
    for (const item of ws.list.getSnapshot().items) {
      const saved = backup[item.workspaceId]
      if (saved === undefined) continue
      const current = item.sessionIds
      const present = new Set(current)
      const desired: string[] = []
      for (const id of saved) {
        if (present.has(id) && !desired.includes(id)) desired.push(id)
      }
      for (const id of current) {
        if (!desired.includes(id)) desired.push(id)
      }
      if (!sameOrder(current, desired)) await this.applyOrder(item.workspaceId, desired)
    }
  }

  // —— DOM 重排（即时反馈）——

  private sortDom(): void {
    const list = this.sessions.list.getSnapshot()
    const titleMap = buildTitleMap(list)
    const validIds = new Set(list.ids)
    const labels = loadSessionLabels()
    const pinned = loadPinnedSessions()

    const byContainer = new Map<Element, HTMLElement[]>()
    for (const row of sessionRowElements()) {
      const container = listContainerOf(row)
      if (container === null) continue
      const unit = row.parentElement !== null && row.parentElement !== container ? row.parentElement : row
      const bucket = byContainer.get(container)
      if (bucket === undefined) byContainer.set(container, [unit])
      else if (!bucket.includes(unit)) bucket.push(unit)
    }

    for (const [container, units] of byContainer) {
      if (units.length < 2) continue
      const ids: string[] = []
      const unitOf = new Map<string, HTMLElement>()
      const fixed = new Set<HTMLElement>()
      for (const unit of units) {
        const row = isSessionRow(unit) ? unit : (unit.querySelector('[class*="sessionRow"]') as HTMLElement | null)
        const id = row !== null ? resolveRowId(row, titleMap, list.current, validIds) : undefined
        if (id === undefined) {
          // blank 行 / 标题冲突解析不出的行：位置固定，不参与排序也不被挪动。
          fixed.add(unit)
          continue
        }
        ids.push(id)
        unitOf.set(id, unit)
      }
      if (ids.length < 2) continue
      const sorted = sortSessionIds(ids, labels, pinned)
        .map((id) => unitOf.get(id))
        .filter((u): u is HTMLElement => u !== undefined)
      // 固定行留在原索引，其余位置按排序结果填充。
      const next: HTMLElement[] = []
      let cursor = 0
      for (const unit of units) {
        if (fixed.has(unit)) {
          next.push(unit)
          continue
        }
        const candidate = sorted[cursor]
        cursor += 1
        if (candidate !== undefined) next.push(candidate)
      }
      const current = units
      if (next.every((el, i) => el === current[i])) continue
      const first = current[0]
      if (first === undefined) continue
      const marker = document.createComment('dshlabel-sort')
      container.insertBefore(marker, first)
      for (const el of next) container.insertBefore(el, marker)
      marker.remove()
    }
  }

  // —— host 顺序写回 ——

  private persistOrder(): void {
    const ws = this.workspaces
    if (ws === undefined) return
    const labels = loadSessionLabels()
    const pinned = loadPinnedSessions()
    const blank = this.blankSessionIds()
    for (const item of ws.list.getSnapshot().items) {
      if (item.sessionIds.length < 2) continue
      if (this.writing.has(item.workspaceId)) continue
      const until = this.cooldownUntil.get(item.workspaceId)
      if (until !== undefined && Date.now() < until) continue
      const desired = sortSessionIds(item.sessionIds, labels, pinned, blank)
      if (sameOrder(item.sessionIds, desired)) {
        this.attempts.delete(item.workspaceId)
        continue
      }
      if (this.backup[item.workspaceId] === undefined) {
        this.backup[item.workspaceId] = Array.from(item.sessionIds)
        saveBackup(this.backup)
      }
      void this.applyOrder(item.workspaceId, desired)
    }
  }

  /**
   * 把 desired 写成 host 顺序：**从右往左**做插入排序——先把最后一个放到末尾，
   * 再把倒数第二个插到它前面……每个元素都插到「目标里它的后继」之前（最后一个追加）。
   * 从右往左是因为左往右移动会在后续插入时把已经排好的前缀再挤乱。
   */
  private async applyOrder(workspaceId: string, desired: string[]): Promise<void> {
    const ws = this.workspaces
    if (ws === undefined) return
    this.writing.add(workspaceId)
    try {
      for (let i = desired.length - 1; i >= 0; i -= 1) {
        const id = desired[i]
        if (id === undefined) continue
        const current = this.currentOrder(workspaceId)
        if (current[i] === id) continue
        await ws.insertSessionBefore(workspaceId, id, desired[i + 1])
      }
    } catch {
      // host 拒绝了这次移动（会话已不在工作区等）：拉长下次重试间隔，避免每帧重试。
      this.attempts.set(workspaceId, (this.attempts.get(workspaceId) ?? 0) + 1)
    } finally {
      this.writing.delete(workspaceId)
      // 已经写到位：短暂静默即可；写了却没收敛 / 抛错：指数退避并最终止损。
      const converged = sameOrder(this.currentOrder(workspaceId), desired)
      if (converged) {
        this.attempts.delete(workspaceId)
        this.cooldownUntil.set(workspaceId, Date.now() + 600)
      } else {
        const failures = this.attempts.get(workspaceId) ?? 0
        this.attempts.set(workspaceId, failures + 1)
        const backoff = failures >= 3 ? 120_000 : Math.min(20_000, 800 * 2 ** failures)
        this.cooldownUntil.set(workspaceId, Date.now() + backoff)
      }
    }
  }

  /** 当前空白会话（工作区里的「新会话」占位行）的 id 集合。 */
  private blankSessionIds(): Set<string> {
    const list = this.sessions.list.getSnapshot()
    const ids = new Set<string>()
    for (const id of list.ids) {
      if (list.byId[id]?.blank === true) ids.add(id)
    }
    return ids
  }

  private currentOrder(workspaceId: string): readonly string[] {
    const ws = this.workspaces
    if (ws === undefined) return []
    for (const item of ws.list.getSnapshot().items) {
      if (item.workspaceId === workspaceId) return item.sessionIds
    }
    return []
  }
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false
  return true
}

/** 装配入口：注入「按标签」排序项 + 按标签重排工作区（host 写回 + DOM 即时反馈）。 */
export function initLabelSort(ctx: ClientContext): void {
  if (typeof document === 'undefined') return
  const sessions = ctx.get('sessions') as HestiaSessionsService | undefined
  if (sessions === undefined) return
  const workspaces = ctx.get('workspaces') as HestiaWorkspacesService | undefined
  const controller = new LabelSortController(sessions, workspaces)
  ctx.effect(() => {
    controller.start()
    return () => controller.dispose()
  })
}