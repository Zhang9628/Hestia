/**
 * 会话标签（label）数据层：纯 client，localStorage 持久化。
 *
 * 数据模型（口径已与产品确认）：
 * - **标签 = 「文案 + 颜色」实体，颜色属于标签本身**：同一个标签文案在任何会话里
 *   都是同一个颜色；改一次颜色，所有使用该标签的会话同步变色。
 * - 会话本身**不保存颜色**，只保存标签文案的引用：
 *   `hestia-session-labels` = `{ [sessionId]: labelText }`
 * - 标签实体的颜色表：
 *   `hestia-label-colors` = `{ [labelText]: '#hex' }`
 *
 * 因此「给会话加标签」= 选/建一个标签实体并记住文案；删除会话标签只删引用，
 * 标签实体（及其颜色）保留，方便复用。
 */
import { PRESET_COLORS } from '../color'

/** 会话 → 标签文案。 */
export const SESSION_LABEL_KEY = 'hestia-session-labels'
/** 标签文案 → 颜色（标签实体自身的颜色）。 */
export const LABEL_COLOR_KEY = 'hestia-label-colors'
/** 与 pin 模块共用：排序时置顶会话仍然排在最前（主排序）。 */
export const PIN_STORAGE_KEY = 'hestia-pinned-sessions'

/** 标签文案长度上限（行内 pill 的排版上限，超出截断）。 */
export const LABEL_TEXT_MAX = 20
/** 颜色缺失时的兜底色（与预设里的「灰」一致）。 */
export const DEFAULT_LABEL_COLOR = '#6b7280'

/** 读一张 `{ id: string }` 形状的表，非法值逐条丢弃。 */
function loadStringMap(key: string, accept: (value: string) => boolean): Map<string, string> {
  const map = new Map<string, string>()
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return map
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return map
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && accept(value)) map.set(id, value)
    }
  } catch {
    // ignore
  }
  return map
}

function saveStringMap(key: string, map: ReadonlyMap<string, string>): void {
  try {
    const obj: Record<string, string> = {}
    for (const [id, value] of map) obj[id] = value
    localStorage.setItem(key, JSON.stringify(obj))
  } catch {
    // ignore
  }
}

/** 会话 → 标签文案。 */
export function loadSessionLabels(): Map<string, string> {
  return loadStringMap(SESSION_LABEL_KEY, (value) => value.trim() !== '')
}

export function saveSessionLabels(map: ReadonlyMap<string, string>): void {
  saveStringMap(SESSION_LABEL_KEY, map)
}

/** 标签文案 → 颜色。 */
export function loadLabelColors(): Map<string, string> {
  return loadStringMap(LABEL_COLOR_KEY, (value) => /^#[0-9a-f]{6}$/i.test(value))
}

export function saveLabelColors(map: ReadonlyMap<string, string>): void {
  saveStringMap(LABEL_COLOR_KEY, map)
}

/** 标签实体的颜色（未登记过则用兜底色）。 */
export function labelColorOf(colors: ReadonlyMap<string, string>, text: string): string {
  return colors.get(text) ?? DEFAULT_LABEL_COLOR
}

/**
 * 为新标签挑一个颜色：预设色里「被标签用得最少」的那个（同分取靠前预设），
 * 让新建标签的颜色自然分散、且同一批数据每次算出来一致。
 */
export function nextLabelColor(colors: ReadonlyMap<string, string>): string {
  const counts = new Map<string, number>()
  for (const hex of colors.values()) counts.set(hex, (counts.get(hex) ?? 0) + 1)
  let best = DEFAULT_LABEL_COLOR
  let bestCount = Number.POSITIVE_INFINITY
  for (const preset of PRESET_COLORS) {
    const count = counts.get(preset.hex) ?? 0
    if (count < bestCount) {
      best = preset.hex
      bestCount = count
    }
  }
  return best
}

/** 规范化用户输入的标签文案：去首尾空白、折叠内部空白、截断到上限。 */
export function normalizeLabelText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, LABEL_TEXT_MAX)
}

/** 行内显示文案：中括号包裹（`【前端】`）。 */
export function labelBracket(text: string): string {
  return '【' + text + '】'
}

/**
 * 标签文案排序键：ASCII 打头的（英文 / 数字标签）排在中文前面，各自内部排序——
 * 英文 / 数字按 en 排序，中文按拼音（locale 升序），数字按数值（9 号 < 10 号）。
 *
 * 说明：CLDR 的 zh 排序会把拉丁字母排在汉字之后，混用中英标签时「frontend」会跑到
 * 所有中文标签后面，不符合直觉，所以这里显式分桶。
 */
const EN_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
const ZH_COLLATOR = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' })

export function compareLabelText(a: string, b: string): number {
  const aAscii = isAsciiHead(a)
  const bAscii = isAsciiHead(b)
  if (aAscii !== bAscii) return aAscii ? -1 : 1
  return aAscii ? EN_COLLATOR.compare(a, b) : ZH_COLLATOR.compare(a, b)
}

/** 首字符是否为 ASCII（英文 / 数字 / 符号标签）。 */
function isAsciiHead(text: string): boolean {
  const code = text.codePointAt(0)
  return code !== undefined && code < 128
}

/** 已置顶会话集合（与 pin 模块同一份存储）。 */
export function loadPinnedSessions(): Set<string> {
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

/**
 * 二级排序键：新会话（blank）最前 → 置顶优先 → 有标签优先 → 标签文案 locale
 * 升序 → 保持原相对顺序。未上标签的会话整体沉底，组内仍是原来的 host 顺序。
 *
 * blank（工作区里的「新会话」占位行）必须留在最前：它是刚点「新建会话」的入口，
 * 被标签排序挤到列表底部会很难用。
 */
export function sortSessionIds(
  ids: readonly string[],
  labels: ReadonlyMap<string, string>,
  pinned: ReadonlySet<string>,
  blank: ReadonlySet<string> = new Set(),
): string[] {
  const entries = ids.map((id, index) => ({
    id,
    index,
    text: labels.get(id)?.trim() ?? '',
    pinned: pinned.has(id),
    blank: blank.has(id),
  }))
  entries.sort((a, b) => {
    if (a.blank !== b.blank) return a.blank ? -1 : 1
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if ((a.text === '') !== (b.text === '')) return a.text === '' ? 1 : -1
    if (a.text !== '' && b.text !== '') {
      const byText = compareLabelText(a.text, b.text)
      if (byText !== 0) return byText
    }
    return a.index - b.index
  })
  return entries.map((entry) => entry.id)
}