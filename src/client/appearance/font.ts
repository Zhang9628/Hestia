/**
 * 字体调节器：字号（小/标准/大/特大 + 微调滑块）与字体族下拉。
 * 通过 style 标签覆盖 `[data-slot="conversation"] *`，localStorage 记忆。
 */
import * as React from 'react'

const FONT_STORAGE_KEY = 'hestia-font-size'
const FONT_MIN = 12
const FONT_MAX = 24
const FONT_DEFAULT = 16
const FONT_STEP = 1
const FONT_PRESETS = [
  { label: '小', size: 14 },
  { label: '标准', size: 16 },
  { label: '大', size: 18 },
  { label: '特大', size: 22 },
]
const FONT_FAMILY_STORAGE_KEY = 'hestia-font-family'
const FONT_FAMILIES = [
  { label: '默认（Inter）', value: '' },
  { label: '系统', value: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  { label: '宋体', value: '"SimSun", "宋体", serif' },
  { label: '黑体', value: '"SimHei", "黑体", sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { label: '楷体', value: '"KaiTi", "楷体", serif' },
  { label: '等宽', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
]

function loadFontSize(): number {
  try {
    const raw = localStorage.getItem(FONT_STORAGE_KEY)
    const n = Number(raw)
    if (Number.isFinite(n) && n >= FONT_MIN && n <= FONT_MAX) return n
  } catch {
    // ignore
  }
  return FONT_DEFAULT
}

function loadFontFamily(): string {
  try {
    const raw = localStorage.getItem(FONT_FAMILY_STORAGE_KEY)
    if (raw !== null && FONT_FAMILIES.some((f) => f.value === raw)) return raw
  } catch {
    // ignore
  }
  return ''
}

function magnetFontSize(raw: number): number {
  return Math.round(raw)
}

export function FontSizeControl(): React.ReactElement {
  const [fontSize, setFontSize] = React.useState<number>(loadFontSize)
  const [fontFamily, setFontFamily] = React.useState<string>(loadFontFamily)
  const styleRef = React.useRef<HTMLStyleElement | null>(null)

  // 挂载时建一次 style 标签，卸载时才删——与弹层开关解耦。
  React.useEffect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-hestia'
    tag.dataset.pluginCss = 'dsh-hestia/font-dynamic'
    document.head.appendChild(tag)
    styleRef.current = tag
    return () => {
      tag.remove()
      styleRef.current = null
    }
  }, [])

  // 字号/字体变化时只更新内容。
  React.useEffect(() => {
    if (styleRef.current !== null) {
      const familyDecl = fontFamily === '' ? '' : `font-family: ${fontFamily} !important; `
      styleRef.current.textContent = `[data-slot="conversation"] * { ${familyDecl}font-size: ${fontSize}px !important; }`
    }
    try {
      localStorage.setItem(FONT_STORAGE_KEY, String(fontSize))
      localStorage.setItem(FONT_FAMILY_STORAGE_KEY, fontFamily)
    } catch {
      // ignore
    }
  }, [fontSize, fontFamily])

  const presetButtons = FONT_PRESETS.map((p) => {
    const active = fontSize === p.size
    return React.createElement(
      'button',
      { type: 'button', key: p.label, className: 'dshwc-segItem' + (active ? ' dshwc-segItemActive' : ''), onClick: () => setFontSize(p.size) },
      p.label,
    )
  })
  const presets = React.createElement('div', { className: 'dshwc-seg' }, presetButtons)

  const slider = React.createElement('input', {
    type: 'range',
    min: FONT_MIN,
    max: FONT_MAX,
    step: FONT_STEP,
    value: fontSize,
    className: 'dshwc-range',
    'aria-label': '对话字体',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFontSize(magnetFontSize(Number(e.target.value))),
  })
  const track = React.createElement('div', { className: 'dshwc-track' })
  const sliderWrap = React.createElement('div', { className: 'dshwc-sliderWrap' }, [slider, track])

  const value = React.createElement('span', { className: 'dshwc-value' }, fontSize + 'px')
  const fontSelect = React.createElement('select', {
    className: 'dshwc-font',
    value: fontFamily,
    'aria-label': '字体',
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setFontFamily(e.target.value),
  }, FONT_FAMILIES.map((f) => React.createElement('option', { key: f.label, value: f.value }, f.label)))
  return React.createElement(
    'div',
    { className: 'dshwc-root', title: '调整对话字号与字体' },
    [presets, sliderWrap, value, fontSelect],
  )
}
