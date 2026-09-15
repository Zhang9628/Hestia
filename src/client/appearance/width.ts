/**
 * 对话宽度调节器：滑块 + 预设（窄/标准/宽/超宽），靠近预设自动吸附。
 * 写入 CSS 变量 `--dsh-chat-content-width`，localStorage 记忆。
 */
import * as React from 'react'

const STORAGE_KEY = 'hestia-chat-width'
const MIN = 480
const MAX = 1600
const DEFAULT = 748
const STEP = 8
const SNAP_RADIUS = 48
const MAGNET_RANGE = 300
const PRESETS = [
  { label: '窄', width: 640 },
  { label: '标准', width: 748 },
  { label: '宽', width: 1000 },
  { label: '超宽', width: 1280 },
]

function loadWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const n = Number(raw)
    if (Number.isFinite(n) && n >= MIN && n <= MAX) return n
  } catch {
    // ignore
  }
  return DEFAULT
}

function magnetWidth(raw: number): number {
  let nearest = PRESETS[0]!
  for (const p of PRESETS) {
    if (Math.abs(raw - p.width) < Math.abs(raw - nearest.width)) nearest = p
  }
  const dist = Math.abs(raw - nearest.width)
  let next = raw
  if (dist <= SNAP_RADIUS) {
    next = nearest.width
  } else if (dist <= MAGNET_RANGE) {
    const t = (MAGNET_RANGE - dist) / (MAGNET_RANGE - SNAP_RADIUS)
    const pull = t * t * t
    next = raw + (nearest.width - raw) * pull * 0.95
  }
  return Math.round(next / STEP) * STEP
}

export function ChatWidthControl(): React.ReactElement {
  const [width, setWidth] = React.useState<number>(loadWidth)
  const styleRef = React.useRef<HTMLStyleElement | null>(null)

  // 挂载时建一次 style 标签，卸载时才删——与弹层开关解耦。
  React.useEffect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-hestia'
    tag.dataset.pluginCss = 'dsh-hestia/dynamic'
    document.head.appendChild(tag)
    styleRef.current = tag
    return () => {
      tag.remove()
      styleRef.current = null
    }
  }, [])

  // 宽度变化时只更新内容。
  React.useEffect(() => {
    if (styleRef.current !== null) {
      styleRef.current.textContent = `[data-slot="conversation"] > * { --dsh-chat-content-width: ${width}px !important; }`
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(width))
    } catch {
      // ignore
    }
  }, [width])

  const presetButtons = PRESETS.map((p) => {
    const active = width === p.width
    return React.createElement(
      'button',
      {
        type: 'button',
        key: p.label,
        className: 'dshwc-segItem' + (active ? ' dshwc-segItemActive' : ''),
        onClick: () => setWidth(p.width),
      },
      p.label,
    )
  })
  const presets = React.createElement('div', { className: 'dshwc-seg' }, presetButtons)

  const slider = React.createElement('input', {
    type: 'range',
    min: MIN,
    max: MAX,
    step: STEP,
    value: width,
    className: 'dshwc-range',
    'aria-label': '对话宽度',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setWidth(magnetWidth(Number(e.target.value))),
  })
  const track = React.createElement('div', { className: 'dshwc-track' })
  const sliderWrap = React.createElement('div', { className: 'dshwc-sliderWrap' }, [slider, track])

  const value = React.createElement('span', { className: 'dshwc-value' }, width + 'px')
  return React.createElement(
    'div',
    { className: 'dshwc-root', title: '拖动滑块调整对话宽度（每行文字量）' },
    [presets, sliderWrap, value],
  )
}
