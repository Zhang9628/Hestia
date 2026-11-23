/**
 * 会话标签（label）行内展示 + 编辑弹层：列表增强（纯 client，无 host 半）。
 *
 * 展示口径（需求）：会话行 = `标签颜色点` + `【标签文案】` + 会话原名 + 原有内容。
 * - 颜色点 / 胶囊文字色都取自**标签实体自身的颜色**（`hesita-label-colors`），
 *   与「标识颜色」（左侧色条 `hestia-session-colors`）是两套独立视觉。
 * - 无标签的会话不渲染这两段，行内容与现状完全一致。
 * - 标签节点插在标题元素**之前**：标题元素文本必须保持 displayTitle 原样，
 *   pin / color / group / usage 都靠「标题文本 → sessionId」定位。
 *
 * 编辑：hover 行尾出现标签按钮（与置顶 / 颜色按钮并排），点击弹出编辑弹层。
 * 弹层里输入文案 + 选颜色；文案已存在时颜色跟随该标签（改色 = 全量生效），
 * 文案是新的则以选中颜色创建标签实体。
 */
import type { ClientContext } from '../context'
import { PRESET_COLORS } from '../color'
import {
  LABEL_TEXT_MAX,
  compareLabelText,
  labelBracket,
  labelColorOf,
  loadLabelColors,
  loadSessionLabels,
  nextLabelColor,
  normalizeLabelText,
  saveLabelColors,
  saveSessionLabels,
} from './store'
import {
  type HestiaSessionsService,
  buildTitleMap,
  isRealSessionRow,
  resolveRowId,
  sessionRowElements,
  titleElementOf,
} from './rows'

/** 行内标签容器（颜色点 + 文案胶囊）。 */
const WRAP_CLASS = 'dshlabel'
const DOT_CLASS = 'dshlabel-dot'
const PILL_CLASS = 'dshlabel-pill'
/** 行尾标签按钮。 */
const BTN_CLASS = 'dshlabel-btn'
/** 编辑弹层。 */
const POP_CLASS = 'dshlabel-pop'
const OPEN_CLASS = 'dshlabel-open'

/** 标签图标（lucide tag，2px 描边；有标签时整枚按钮染成标签色）。 */
const TAG_SVG =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>' +
  '<circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>' +
  '</svg>'

/** 取直接子元素里 class 命中的那个（避免 querySelector 误命中嵌套结构）。 */
function childWithClass(row: Element, className: string): HTMLElement | null {
  for (const child of Array.from(row.children)) {
    if (child.classList.contains(className)) return child as HTMLElement
  }
  return null
}

class LabelController {
  private readonly sessions: HestiaSessionsService
  private labels: Map<string, string> = loadSessionLabels()
  private colors: Map<string, string> = loadLabelColors()
  private observer: MutationObserver | null = null
  private unsubscribe: (() => void) | null = null
  private rafId: number | null = null

  // 编辑弹层（全局单例，惰性创建）
  private pop: HTMLElement | null = null
  private input: HTMLInputElement | null = null
  private swatchRow: HTMLElement | null = null
  private chipRow: HTMLElement | null = null
  private hint: HTMLElement | null = null
  private editingId: string | null = null
  private pendingColor: string = nextLabelColor(this.colors)
  private popClose: (() => void) | null = null

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
    this.closeEditor()
    this.pop?.remove()
    this.pop = null
    for (const el of Array.from(document.querySelectorAll('.' + BTN_CLASS))) el.remove()
    for (const el of Array.from(document.querySelectorAll('.' + WRAP_CLASS))) el.remove()
    for (const row of Array.from(document.querySelectorAll('[data-hestia-label]'))) row.removeAttribute('data-hestia-label')
  }

  /** 合并到下一帧（会话流式输出时 DOM 每帧都在变，用 rAF 合并避免抖动 / 饿死）。 */
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
    const currentId = list.current
    const validIds = new Set(list.ids)
    for (const row of sessionRowElements()) this.syncRow(row, titleMap, currentId, validIds)
  }

  private syncRow(
    row: HTMLElement,
    titleMap: Map<string, string[]>,
    currentId: string | undefined,
    validIds: ReadonlySet<string>,
  ): void {
    // blank 行（工作区里的「新会话」占位）没有标签能力。
    if (!isRealSessionRow(row)) {
      childWithClass(row, WRAP_CLASS)?.remove()
      childWithClass(row, BTN_CLASS)?.remove()
      row.removeAttribute('data-hestia-label')
      return
    }
    const id = resolveRowId(row, titleMap, currentId, validIds)
    // 解析不到时不销毁已有装饰：粘性缓存下一次 refresh 会补上，避免闪烁。
    if (id === undefined) return
    this.syncButton(row, id)
    this.syncDecoration(row, id)
  }

  private syncDecoration(row: HTMLElement, id: string): void {
    const text = this.labels.get(id)?.trim() ?? ''
    let wrap = childWithClass(row, WRAP_CLASS)

    if (text === '') {
      wrap?.remove()
      row.removeAttribute('data-hestia-label')
      return
    }

    const color = labelColorOf(this.colors, text)
    if (wrap === null) {
      wrap = document.createElement('span')
      wrap.className = WRAP_CLASS
      const dot = document.createElement('span')
      dot.className = DOT_CLASS
      const pill = document.createElement('span')
      pill.className = PILL_CLASS
      wrap.appendChild(dot)
      wrap.appendChild(pill)
    }

    wrap.style.setProperty('--hestia-label-color', color)
    const pill = wrap.lastElementChild
    if (pill !== null && pill.textContent !== labelBracket(text)) pill.textContent = labelBracket(text)

    // 必须在标题元素之前：标题文本要保持 displayTitle 原样。
    const title = titleElementOf(row)
    if (title !== null) {
      if (wrap.nextElementSibling !== title) row.insertBefore(wrap, title)
    } else if (wrap.parentElement !== row) {
      row.insertBefore(wrap, row.firstChild)
    }
    row.setAttribute('data-hestia-label', text)
  }

  private syncButton(row: HTMLElement, id: string): void {
    let btn = childWithClass(row, BTN_CLASS) as HTMLButtonElement | null
    if (btn === null) {
      btn = document.createElement('button')
      btn.type = 'button'
      btn.className = BTN_CLASS
      btn.innerHTML = TAG_SVG
      btn.addEventListener('click', (e) => this.onButtonClick(e))
      // 稳定顺序：置顶 → 标识颜色 → 标签（颜色按钮之后；没有颜色按钮就追加到行尾）。
      const colorBtn = row.querySelector('.dshcolor-btn')
      if (colorBtn !== null && colorBtn.parentElement === row) row.insertBefore(btn, colorBtn.nextSibling)
      else row.appendChild(btn)
    }

    const text = this.labels.get(id)?.trim() ?? ''
    btn.setAttribute('data-hestia-label-id', id)
    btn.classList.toggle('is-labeled', text !== '')
    btn.style.setProperty('--hestia-label-color', text !== '' ? labelColorOf(this.colors, text) : 'transparent')
    btn.setAttribute('aria-label', text !== '' ? '修改会话标签：' + text : '添加会话标签')
    btn.setAttribute('title', text !== '' ? '标签：' + text : '添加标签')
  }

  private onButtonClick(e: Event): void {
    e.preventDefault()
    e.stopPropagation()
    const target = e.currentTarget
    if (!(target instanceof HTMLElement)) return
    const id = target.getAttribute('data-hestia-label-id')
    if (id === null || id === '') return
    this.openEditor(target, id)
  }

  // —— 编辑弹层 ——

  private ensurePopover(): HTMLElement {
    if (this.pop !== null) return this.pop

    const pop = document.createElement('div')
    pop.className = POP_CLASS
    pop.setAttribute('role', 'dialog')
    pop.setAttribute('aria-label', '会话标签')

    const head = document.createElement('div')
    head.className = 'dshlabel-pop-head'
    const title = document.createElement('span')
    title.className = 'dshlabel-pop-title'
    title.textContent = '会话标签'
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'dshlabel-pop-close'
    close.setAttribute('aria-label', '关闭')
    close.textContent = '×'
    close.addEventListener('click', (e) => {
      e.stopPropagation()
      this.closeEditor()
    })
    head.appendChild(title)
    head.appendChild(close)

    const swatches = document.createElement('div')
    swatches.className = 'dshlabel-swatches'

    const input = document.createElement('input')
    input.className = 'dshlabel-input'
    input.type = 'text'
    input.maxLength = LABEL_TEXT_MAX
    input.placeholder = '输入标签，如：前端 / 调研 / 待办'
    input.addEventListener('input', () => this.syncEditorState(true))
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.commit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.closeEditor()
      }
    })

    const hint = document.createElement('div')
    hint.className = 'dshlabel-hint'

    const chipsTitle = document.createElement('div')
    chipsTitle.className = 'dshlabel-chips-title'
    chipsTitle.textContent = '已有标签'

    const chips = document.createElement('div')
    chips.className = 'dshlabel-chips'

    const foot = document.createElement('div')
    foot.className = 'dshlabel-pop-foot'
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'dshlabel-remove'
    remove.textContent = '移除标签'
    remove.addEventListener('click', (e) => {
      e.stopPropagation()
      this.removeLabel()
    })
    const save = document.createElement('button')
    save.type = 'button'
    save.className = 'dshlabel-save'
    save.textContent = '保存'
    save.addEventListener('click', (e) => {
      e.stopPropagation()
      this.commit()
    })
    foot.appendChild(remove)
    foot.appendChild(save)

    pop.appendChild(head)
    pop.appendChild(swatches)
    pop.appendChild(input)
    pop.appendChild(hint)
    pop.appendChild(chipsTitle)
    pop.appendChild(chips)
    pop.appendChild(foot)
    document.body.appendChild(pop)

    this.pop = pop
    this.input = input
    this.swatchRow = swatches
    this.chipRow = chips
    this.hint = hint
    return pop
  }

  private openEditor(anchor: HTMLElement, id: string): void {
    this.editingId = id
    const pop = this.ensurePopover()
    const current = this.labels.get(id)?.trim() ?? ''
    const input = this.input
    if (input !== null) {
      input.value = current
      this.pendingColor = current !== '' ? labelColorOf(this.colors, current) : nextLabelColor(this.colors)
    }
    this.syncEditorState(true)

    const rect = anchor.getBoundingClientRect()
    const width = 288
    pop.classList.add(OPEN_CLASS)
    const height = pop.offsetHeight > 0 ? pop.offsetHeight : 268
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
    let top = rect.bottom + 6
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6)
    pop.style.left = left + 'px'
    pop.style.top = top + 'px'

    input?.focus()
    input?.select()

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!pop.contains(target) && target !== anchor && !anchor.contains(target)) this.closeEditor()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeEditor()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    this.popClose = () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }

  /**
   * 依输入文案刷新：色板选中态、已有标签、提示语。
   * @param resetColor 文案变化时（输入 / 点胶囊 / 打开弹层）为 true：命中已有标签
   *   就把待用颜色切到该标签的颜色；用户点色板时传 false，保留手动选色。
   */
  private syncEditorState(resetColor = false): void {
    const text = normalizeLabelText(this.input?.value ?? '')
    // 文案命中已有标签时，颜色跟随标签实体（标签颜色全局统一）。
    const existing = text !== '' ? this.colors.get(text) : undefined
    if (resetColor && existing !== undefined) this.pendingColor = existing

    const swatchRow = this.swatchRow
    if (swatchRow !== null) {
      swatchRow.replaceChildren()
      for (const preset of PRESET_COLORS) {
        const swatch = document.createElement('button')
        swatch.type = 'button'
        swatch.className = 'dshlabel-swatch'
        swatch.style.background = preset.hex
        swatch.setAttribute('aria-label', '标签颜色 ' + preset.label)
        swatch.setAttribute('title', preset.label)
        swatch.classList.toggle('is-selected', preset.hex === this.pendingColor)
        swatch.addEventListener('click', (e) => {
          e.stopPropagation()
          this.pendingColor = preset.hex
          this.syncEditorState(false)
        })
        swatchRow.appendChild(swatch)
      }
    }

    const chipRow = this.chipRow
    if (chipRow !== null) {
      chipRow.replaceChildren()
      const texts = Array.from(this.colors.keys()).sort(compareLabelText)
      if (texts.length === 0) {
        const empty = document.createElement('span')
        empty.className = 'dshlabel-chips-empty'
        empty.textContent = '还没有标签，输入文案即可新建'
        chipRow.appendChild(empty)
      }
      for (const label of texts) {
        const chip = document.createElement('button')
        chip.type = 'button'
        chip.className = 'dshlabel-chip'
        chip.style.setProperty('--hestia-label-color', labelColorOf(this.colors, label))
        chip.textContent = label
        chip.setAttribute('title', '使用标签「' + label + '」')
        chip.addEventListener('click', (e) => {
          e.stopPropagation()
          if (this.input !== null) {
            this.input.value = label
            this.input.focus()
          }
          this.syncEditorState(true)
        })
        chipRow.appendChild(chip)
      }
    }

    if (this.hint !== null) {
      if (text === '') {
        this.hint.textContent = '标签颜色属于标签本身：同名标签在所有会话里同色'
      } else if (existing !== undefined) {
        this.hint.textContent = '「' + text + '」已存在，颜色跟随该标签；改色会同步所有使用它的会话'
      } else {
        this.hint.textContent = '将新建标签「' + text + '」，颜色为该标签专属'
      }
    }
  }

  private commit(): void {
    const id = this.editingId
    if (id === null) return
    const text = normalizeLabelText(this.input?.value ?? '')
    if (text === '') {
      this.labels.delete(id)
      this.persist()
      this.closeEditor()
      return
    }
    this.labels.set(id, text)
    if (this.colors.get(text) !== this.pendingColor) this.colors.set(text, this.pendingColor)
    this.persist()
    this.closeEditor()
  }

  private removeLabel(): void {
    const id = this.editingId
    if (id === null) {
      this.closeEditor()
      return
    }
    this.labels.delete(id)
    this.persist()
    this.closeEditor()
  }

  private persist(): void {
    saveSessionLabels(this.labels)
    saveLabelColors(this.colors)
    this.refresh()
  }

  private closeEditor(): void {
    this.pop?.classList.remove(OPEN_CLASS)
    this.editingId = null
    if (this.popClose !== null) {
      this.popClose()
      this.popClose = null
    }
  }
}

/** 装配入口：订阅 sessions.list + 观察 DOM，为会话行加标签展示与编辑入口。 */
export function initSessionLabels(ctx: ClientContext): void {
  if (typeof document === 'undefined') return
  const sessions = ctx.get('sessions') as HestiaSessionsService | undefined
  if (sessions === undefined) return
  const controller = new LabelController(sessions)
  ctx.effect(() => {
    controller.start()
    return () => controller.dispose()
  })
}