/**
 * 字体调节器：字号（小/标准/大/特大 + 微调滑块）与字体族下拉。
 *
 * 0.1.5-rc.1 起 shell 内置了对话内容字号能力（ThemeRuntime.setFontSize /
 * `--dsh-content-font-size`，范围 12–17px，默认 14px），字号部分直接对接内置
 * （单一事实源，持久化到 host settings），不再用 CSS 硬盖；字体族仍走 style 标签
 * 覆盖 `[data-conversation-scroll]`（消息区滚动容器），localStorage 记忆。
 */
import * as React from 'react'
import type { ClientContext } from '../context'
import type { HestiaThemeService } from '../theme'

/** 字号范围对齐 shell 内置（FONT_SIZE_MIN=12 / FONT_SIZE_MAX=17 / DEFAULT=14）。 */
const FONT_MIN = 12
const FONT_MAX = 17
const FONT_DEFAULT = 14
const FONT_STEP = 1
const FONT_PRESETS = [
  { label: '小', size: 12 },
  { label: '标准', size: 14 },
  { label: '大', size: 16 },
  { label: '特大', size: 17 },
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

function clampFontSize(n: number): number {
  if (!Number.isFinite(n)) return FONT_DEFAULT
  return n < FONT_MIN ? FONT_MIN : n > FONT_MAX ? FONT_MAX : Math.round(n)
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

export function FontSizeControl(props: { theme: HestiaThemeService | undefined; ctx: ClientContext }): React.ReactElement {
  const { theme, ctx } = props
  const [fontSize, setFontSize] = React.useState<number>(() => clampFontSize(theme?.getTheme().fontSize ?? FONT_DEFAULT))
  const [fontFamily, setFontFamily] = React.useState<string>(loadFontFamily)
  const styleRef = React.useRef<HTMLStyleElement | null>(null)

  // 与内置字号设置保持同步（设置页 FontSizeRow / 外部 theme/change 都可能改字号）。
  React.useEffect(() => {
    const sync = (): void => {
      const n = theme?.getTheme().fontSize
      setFontSize(clampFontSize(n ?? FONT_DEFAULT))
    }
    const off = ctx.on('theme/change', sync)
    return () => {
      off()
    }
  }, [theme, ctx])

  // 字体族 style 标签：挂载建一次，卸载时才删——与弹层开关解耦。
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

  // 字体族变化时只更新内容。
  React.useEffect(() => {
    if (styleRef.current !== null) {
      styleRef.current.textContent = fontFamily === '' ? '' : `[data-conversation-scroll] { font-family: ${fontFamily} !important; }`
    }
    try {
      localStorage.setItem(FONT_FAMILY_STORAGE_KEY, fontFamily)
    } catch {
      // ignore
    }
  }, [fontFamily])

  const pickSize = (size: number): void => {
    setFontSize(size)
    try {
      theme?.setFontSize(size)
    } catch {
      // ignore（theme 未就绪 / 值越界时静默）
    }
  }

  const presetButtons = FONT_PRESETS.map((p) => {
    const active = fontSize === p.size
    return React.createElement(
      'button',
      { type: 'button', key: p.label, className: 'dshwc-segItem' + (active ? ' dshwc-segItemActive' : ''), onClick: () => pickSize(p.size) },
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
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => pickSize(Math.round(Number(e.target.value))),
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
