/**
 * 会话导航：滚动到顶「上箭头」+ 右侧「轮次时间轴」+ 轮次悬停卡（摘要 + 时间戳）。
 * 纯 client，无 host 半。
 *
 * 逆向结论（见 dsh-client-ui-conversation@0.1.1-rc.2 源码）：
 * - 会话滚动容器两种形态，用 shell 的 `scrollerOf` 逻辑统一：
 *   `flowEl.closest('[data-conversation-scroll]') ?? 其祖先 [class*="scroll"]`。
 *   外层模式 = ConversationRoot 的 `scrollBody[data-conversation-scroll]`（页面级滚动，
 *   底部粘着 composer）；内层模式 = ChatView 的 `scroll`（overflow-y:auto）。
 * - 消息 DOM：ChatView 返回 `root > scroll > column[data-chat-flow] > flowItem*`；
 *   每个 flowItem 带 `data-chat-flow-key` / `data-chat-flow-kind`。
 * - 「一轮对话」的开头 = `data-chat-flow-kind="user"` 的 flowItem（用户发起的每一轮）。
 * - 用户消息正文在 `[class*="bubble"]`；系统「下箭头」= `button[class*="toBottom"]`；
 *   「加载更早」按钮 = `[class*="older"] button`（`hasMore` 时渲染，点击加载一段更早历史）。
 *
 * 定位策略（`position: fixed` 叠加层，挂 body，滚动/尺寸/结构变化时按 rAF 刷新）：
 * - 上箭头：水平对齐下箭头右缘、垂直置于其上方 8px；非顶部时显示。
 * - 时间轴：轨道固定在会话视口右缘（扣除 composer 高度），圆点 Y 按
 *   「轮内容偏移 / 可滚动范围」比例定位。
 * - 悬停卡：摘要取 DOM bubble 文本前 50 字；时间戳由 React 数据桥（useSession 读会话快照）
 *   写入 navTimesRef，按轮序 index 对应。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import * as React from 'react'

const PREVIEW_LENGTH = 50
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 会话快照最小结构视图（只取 nodes 里 user 消息的 time）。 */
interface HestiaConversationNode {
  kind: string
  time?: number
}
interface HestiaConversationSnapshot {
  nodes: ReadonlyArray<HestiaConversationNode>
}
type HestiaUseSession = <S>(sel: (snap: HestiaConversationSnapshot) => S) => S

/** slots 服务最小结构视图（注入 + 注册会话级 slot）。 */
interface HestiaSlotsService {
  inject(key: string, cb: () => void): void
  register(opts: { name: string; id: string }, render: (props: unknown) => unknown): void
}

/** 各轮（用户消息）时间戳的共享引用：由 NavTimeBridge 写入，DOM 控制器读取。 */
const navTimesRef: { times: number[] } = { times: [] }

/** 从会话快照提取各轮（用户消息）时间戳（按顺序，与 DOM flowItem 一一对应）。 */
function extractUserTimes(snap: HestiaConversationSnapshot): number[] {
  const out: number[] = []
  for (const n of snap.nodes) {
    if (n.kind === 'user' && typeof n.time === 'number') out.push(n.time)
  }
  return out
}

/** React 数据桥：挂在会话级 slot，用 useSession 把各轮时间戳推进 navTimesRef。 */
export function NavTimeBridge(props: { useSession?: HestiaUseSession }): null {
  const useSession = props.useSession
  if (useSession !== undefined) navTimesRef.times = useSession(extractUserTimes)
  return null
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/** 读取 composer 高度（CSS 变量，默认 152px）。 */
function readComposerHeight(): number {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--dsh-composer-height')
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) && n > 0 ? n : 152
  } catch {
    return 152
  }
}

/** 时间戳格式化：2026-09-10 15:13:16 周四。 */
function formatTimestamp(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number): string => (n < 10 ? '0' + n : String(n))
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' ' +
    (WEEKDAYS[d.getDay()] ?? '')
  )
}

/** 取该轮开头缩略：用户消息正文前 50 字（折叠空白）。 */
function previewOf(flowItem: HTMLElement): string {
  const bubble = flowItem.querySelector('[class*="bubble"]')
  const raw = (bubble !== null ? bubble.textContent : flowItem.textContent) ?? ''
  const collapsed = raw.replace(/\s+/g, ' ').trim()
  return collapsed.length > PREVIEW_LENGTH ? collapsed.slice(0, PREVIEW_LENGTH) + '…' : collapsed
}

/** 上箭头图标（lucide chevron-up，2px 描边，与系统 IconChevronDown 同风格）。 */
const UP_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M18 15l-6-6-6 6"/>' +
  '</svg>'

interface HestiaRound {
  el: HTMLElement
  preview: string
}

class ConversationNavController {
  private observer: MutationObserver | null = null
  private resizeObserver: ResizeObserver | null = null
  private resizeObserved: HTMLElement | null = null
  private rafId: number | null = null
  private upBtn: HTMLButtonElement | null = null
  private rail: HTMLElement | null = null
  private tip: HTMLElement | null = null
  private rounds: HestiaRound[] = []
  private roundsSig = ''
  private lastScrollable = -1
  private readonly onScrollCapture = (): void => this.schedule()
  private readonly onWindowResize = (): void => this.schedule()

  start(): void {
    this.refresh()
    this.observer = new MutationObserver(() => this.schedule())
    this.observer.observe(document.body, { childList: true, subtree: true })
    // 滚动事件不冒泡，用捕获阶段监听以覆盖任意滚动容器（外层/内层模式通用）。
    document.addEventListener('scroll', this.onScrollCapture, { capture: true, passive: true })
    window.addEventListener('resize', this.onWindowResize)
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.observer?.disconnect()
    this.observer = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.resizeObserved = null
    document.removeEventListener('scroll', this.onScrollCapture, { capture: true } as EventListenerOptions)
    window.removeEventListener('resize', this.onWindowResize)
    this.upBtn?.remove()
    this.upBtn = null
    this.rail?.remove()
    this.rail = null
    this.tip?.remove()
    this.tip = null
    this.rounds = []
    this.roundsSig = ''
    this.lastScrollable = -1
  }

  private schedule(): void {
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.refresh()
    })
  }

  /** 定位当前会话的滚动容器（镜像 shell 的 scrollerOf）。 */
  private scroller(): HTMLElement | null {
    const flow = document.querySelector('[data-chat-flow-key]')
    if (!(flow instanceof HTMLElement)) return null
    const column = flow.parentElement
    if (!(column instanceof HTMLElement)) return null
    const scroll = column.parentElement
    if (!(scroll instanceof HTMLElement)) return null
    const outer = scroll.closest('[data-conversation-scroll]')
    return outer instanceof HTMLElement ? outer : scroll
  }

  private refresh(): void {
    const scroller = this.scroller()
    if (scroller === null) {
      this.hideAll()
      this.roundsSig = ''
      this.lastScrollable = -1
      return
    }
    this.observeResize(scroller)

    const scrollerRect = scroller.getBoundingClientRect()
    const isOuter = scroller.hasAttribute('data-conversation-scroll')
    const composerH = isOuter ? readComposerHeight() : 0

    this.syncUpButton(scroller, scrollerRect, composerH)
    this.syncRail(scroller, scrollerRect, composerH)
  }

  private observeResize(scroller: HTMLElement): void {
    if (this.resizeObserved === scroller) return
    this.resizeObserver?.disconnect()
    this.resizeObserver = new ResizeObserver(() => this.schedule())
    this.resizeObserver.observe(scroller)
    this.resizeObserved = scroller
  }

  private hideAll(): void {
    if (this.upBtn !== null) this.upBtn.style.display = 'none'
    if (this.rail !== null) this.rail.style.display = 'none'
    this.hideTip()
  }

  // ---- 上箭头 ----

  private ensureUpButton(): HTMLButtonElement {
    if (this.upBtn !== null) return this.upBtn
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'dshnav-up'
    btn.setAttribute('aria-label', '跳转到会话开头')
    btn.setAttribute('title', '回到开头')
    btn.innerHTML = UP_SVG
    btn.addEventListener('click', () => {
      void this.jumpToVeryTop()
    })
    document.body.appendChild(btn)
    this.upBtn = btn
    return btn
  }

  private syncUpButton(scroller: HTMLElement, scrollerRect: DOMRect, composerH: number): void {
    const atTop = scroller.scrollTop <= 2
    const btn = this.ensureUpButton()
    if (atTop) {
      btn.style.display = 'none'
      return
    }

    // 下箭头按钮（排除 toBottomSlot 容器）。
    const down = document.querySelector('button[class*="toBottom"]')
    let rightPx: number
    let bottomPx: number
    if (down instanceof HTMLElement) {
      const dr = down.getBoundingClientRect()
      rightPx = Math.max(0, window.innerWidth - dr.right)
      bottomPx = Math.max(0, window.innerHeight - dr.top + 8) // 下箭头上方 8px
    } else {
      const column = scroller.querySelector('[data-chat-flow]')
      const cr = column instanceof HTMLElement ? column.getBoundingClientRect() : scrollerRect
      rightPx = Math.max(0, window.innerWidth - cr.right)
      bottomPx = Math.max(0, window.innerHeight - scrollerRect.bottom + composerH + 58)
    }

    btn.style.right = rightPx + 'px'
    btn.style.bottom = bottomPx + 'px'
    btn.style.display = 'flex'
  }

  /**
   * 跳到「最最开头」：先反复点击「加载更早」把更早历史全部载入（否则顶部只显示
   * 「加载更早」按钮而非第一条消息），再平滑滚到顶。安全上限防止死循环。
   *
   * 速度优化：不再每点一次固定空等 320ms，而是等「这一页真正加载完」就立刻点下一次。
   * 用 MutationObserver 监听「加载更早」按钮的 disabled 属性（对应 session 的
   * loadingOlder 状态），disabled 消失或按钮消失（hasMore=false）即视为完成，
   * 把固定空等压缩成「实际加载耗时」。
   */
  private async jumpToVeryTop(): Promise<void> {
    const scroller = this.scroller()
    if (scroller === null) return
    for (let i = 0; i < 300; i++) {
      const btn = this.findOlderButton(scroller)
      if (btn === null) break // 没有更多历史，已到最开头
      if (btn.disabled) {
        // 上一次点击仍在加载（如用户刚手动点过「加载更早」），等它结束再继续。
        await this.waitForOlderPage(scroller)
        continue
      }
      btn.click()
      await this.waitForOlderPage(scroller)
    }

    // 加载更早历史会让 column 变高，shell 的 ResizeObserver 若判定用户「仍在底部」
    // （followRef 里 scrollTop = scrollHeight）会在下一帧把滚动抢回底部，导致第一次点击
    // 白点、要再点一次。这里等一帧渲染周期让 shell 的「跟底」逻辑 settle 后再滚，
    // 保证一次点击即到顶（一次性 80ms，非每页都等）。
    await new Promise((resolve) => setTimeout(resolve, 80))
    scroller.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /**
   * 等待一轮「加载更早」真正结束：先看到按钮进入 loading（disabled），
   * 再看到它回到可点（enabled）或整体消失（hasMore 变 false）。
   * 用 MutationObserver 驱动（无固定空等），带超时兜底防止卡死。
   */
  private waitForOlderPage(scroller: HTMLElement, timeoutMs = 8000): Promise<void> {
    return new Promise((resolve) => {
      let settled = false
      let sawLoading = false
      let observer: MutationObserver | null = null
      let timer = 0

      const settle = (): void => {
        if (settled) return
        settled = true
        observer?.disconnect()
        clearTimeout(timer)
        resolve()
      }

      const inspect = (): void => {
        const btn = this.findOlderButton(scroller)
        if (btn === null) {
          settle() // 按钮消失：没有更多历史
          return
        }
        if (btn.disabled) {
          sawLoading = true // 本页加载已开始
          return
        }
        // 按钮回到可点：若之前见过 loading，说明本页已加载完
        if (sawLoading) settle()
      }

      observer = new MutationObserver(inspect)
      observer.observe(scroller, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled'],
      })

      timer = setTimeout(settle, timeoutMs)

      // 初次检查：点击后 React 尚未 flush 时按钮仍是 enabled 且 sawLoading=false，
      // 不会提前 settle；等 disabled 出现→消失后才算真正完成。
      inspect()
    })
  }

  private findOlderButton(scroller: HTMLElement): HTMLButtonElement | null {
    const btn = scroller.querySelector('[class*="older"] button')
    return btn instanceof HTMLButtonElement ? btn : null
  }

  // ---- 时间轴 ----

  private ensureRail(): HTMLElement {
    if (this.rail !== null) return this.rail
    const rail = document.createElement('div')
    rail.className = 'dshnav-rail'
    const line = document.createElement('div')
    line.className = 'dshnav-line'
    rail.appendChild(line)
    document.body.appendChild(rail)
    this.rail = rail
    return rail
  }

  private collectRounds(scroller: HTMLElement): HestiaRound[] {
    const rounds: HestiaRound[] = []
    for (const el of Array.from(scroller.querySelectorAll('[data-chat-flow-kind="user"]'))) {
      if (el instanceof HTMLElement) rounds.push({ el, preview: previewOf(el) })
    }
    return rounds
  }

  private syncRail(scroller: HTMLElement, scrollerRect: DOMRect, composerH: number): void {
    const rounds = this.collectRounds(scroller)
    if (rounds.length < 2) {
      if (this.rail !== null) this.rail.style.display = 'none'
      this.hideTip()
      this.roundsSig = ''
      this.lastScrollable = -1
      return
    }

    const rail = this.ensureRail()
    rail.style.display = 'flex'
    rail.style.right = (Math.max(0, window.innerWidth - scrollerRect.right) + 12) + 'px'
    rail.style.top = (scrollerRect.top + 8) + 'px'
    const railH = Math.max(0, scrollerRect.height - composerH - 16)
    rail.style.height = railH + 'px'

    const scrollable = scroller.scrollHeight - scroller.clientHeight
    const sig = rounds.map((r) => r.el.getAttribute('data-chat-flow-key') ?? '').join('\n')
    if (sig !== this.roundsSig || scrollable !== this.lastScrollable) {
      this.roundsSig = sig
      this.lastScrollable = scrollable
      this.rounds = rounds
      this.rebuildDots(scroller, scrollerRect, rounds, railH, scrollable)
    }

    this.syncActiveDot(scroller, scrollerRect)
  }

  private rebuildDots(
    scroller: HTMLElement,
    scrollerRect: DOMRect,
    rounds: HestiaRound[],
    railH: number,
    scrollable: number,
  ): void {
    if (this.rail === null) return
    this.hideTip()
    for (const dot of Array.from(this.rail.querySelectorAll('.dshnav-dot'))) dot.remove()

    rounds.forEach((round, i) => {
      const dot = document.createElement('button')
      dot.type = 'button'
      dot.className = 'dshnav-dot'
      dot.setAttribute('aria-label', '第 ' + (i + 1) + ' 轮')

      const off = round.el.getBoundingClientRect().top - scrollerRect.top + scroller.scrollTop
      const ratio = scrollable > 0
        ? clamp(off / scrollable, 0, 1)
        : (rounds.length > 1 ? i / (rounds.length - 1) : 0)
      dot.style.top = (ratio * railH) + 'px'

      dot.addEventListener('click', () => this.jumpToRound(round))
      dot.addEventListener('mouseenter', (e) => this.showTip(e, round, i))
      dot.addEventListener('mouseleave', () => this.hideTip())

      this.rail!.appendChild(dot)
    })
  }

  private jumpToRound(round: HestiaRound): void {
    const scroller = this.scroller()
    if (scroller === null) return
    const rect = scroller.getBoundingClientRect()
    const off = round.el.getBoundingClientRect().top - rect.top + scroller.scrollTop
    const target = Math.max(0, off - 16) // 留 16px 顶部留白
    scroller.scrollTo({ top: target, behavior: 'smooth' })
  }

  private syncActiveDot(scroller: HTMLElement, scrollerRect: DOMRect): void {
    if (this.rail === null || this.rounds.length === 0) return
    const top = scroller.scrollTop
    let active = -1
    for (let i = 0; i < this.rounds.length; i++) {
      const round = this.rounds[i]
      if (round === undefined) break
      const off = round.el.getBoundingClientRect().top - scrollerRect.top + top
      if (off <= top + 4) active = i
      else break
    }
    const dots = this.rail.querySelectorAll('.dshnav-dot')
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === active))
  }

  // ---- 悬停卡（摘要 + 时间戳） ----

  private ensureTip(): HTMLElement {
    if (this.tip !== null) return this.tip
    const tip = document.createElement('div')
    tip.className = 'dshnav-tip'
    tip.style.display = 'none'
    document.body.appendChild(tip)
    this.tip = tip
    return tip
  }

  private showTip(e: MouseEvent, round: HestiaRound, index: number): void {
    const tip = this.ensureTip()
    tip.textContent = ''

    if (round.preview !== '') {
      const summary = document.createElement('div')
      summary.className = 'dshnav-tip-summary'
      summary.textContent = round.preview
      tip.appendChild(summary)
    }
    const time = navTimesRef.times[index]
    if (typeof time === 'number') {
      const timeEl = document.createElement('div')
      timeEl.className = 'dshnav-tip-time'
      timeEl.textContent = formatTimestamp(time)
      tip.appendChild(timeEl)
    }
    if (tip.childElementCount === 0) return

    tip.style.display = 'block'
    const dot = e.currentTarget as HTMLElement | null
    if (!(dot instanceof HTMLElement)) return
    const dotRect = dot.getBoundingClientRect()
    const tipRect = tip.getBoundingClientRect()
    const left = clamp(dotRect.left - tipRect.width - 10, 8, Math.max(8, window.innerWidth - tipRect.width - 8))
    const top = clamp(dotRect.top + dotRect.height / 2 - tipRect.height / 2, 8, Math.max(8, window.innerHeight - tipRect.height - 8))
    tip.style.left = left + 'px'
    tip.style.top = top + 'px'
  }

  private hideTip(): void {
    if (this.tip !== null) this.tip.style.display = 'none'
  }
}

/** 装配入口：观察会话 DOM + 滚动/尺寸变化，注入「上箭头」「时间轴」；并注册时间戳数据桥。 */
export function initConversationNav(ctx: ClientContext): void {
  if (typeof document === 'undefined') return
  const controller = new ConversationNavController()
  ctx.effect(() => {
    controller.start()
    return () => controller.dispose()
  })

  // 时间戳数据桥：会话级 slot 用 useSession 读快照，把各轮时间戳写入 navTimesRef。
  const slots = ctx.get('slots') as HestiaSlotsService | undefined
  slots?.inject('conversation.session.header.utilities', () => slots.register({
    name: 'conversation.session.header.utilities',
    id: 'hestia-nav-time-bridge',
  }, (props) => React.createElement(NavTimeBridge, { useSession: (props as { useSession?: HestiaUseSession }).useSession })))
}
