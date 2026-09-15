/**
 * 番茄时钟的纯展示小组件：锁/解锁图标、时长步进器、进度环。
 */
import * as React from 'react'

/** 锁图标。 */
export function LockIcon(): React.ReactElement {
  return React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    React.createElement('rect', { x: 3, y: 11, width: 18, height: 11, rx: 2 }),
    React.createElement('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }),
  )
}

/** 解锁图标。 */
export function UnlockIcon(): React.ReactElement {
  return React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    React.createElement('rect', { x: 3, y: 11, width: 18, height: 11, rx: 2 }),
    React.createElement('path', { d: 'M7 11V7a5 5 0 0 1 9.9-1' }),
  )
}

/** 实心锁图标（水墨印章风，墨款式）：粗描边锁扣 + 实心锁体 + 白锁眼。 */
export function SolidLockIcon(): React.ReactElement {
  return React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    React.createElement('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' }),
    React.createElement('rect', { x: 4, y: 11, width: 16, height: 10.5, rx: 2.5, fill: 'currentColor' }),
    React.createElement('circle', { cx: 12, cy: 15.5, r: 1.5, fill: 'var(--dshp-surface, #fff)' }),
  )
}

/** 实心解锁图标（水墨印章风，墨款式）。 */
export function SolidUnlockIcon(): React.ReactElement {
  return React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    React.createElement('path', { d: 'M7 11V7a5 5 0 0 1 9.9-1', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' }),
    React.createElement('rect', { x: 4, y: 11, width: 16, height: 10.5, rx: 2.5, fill: 'currentColor' }),
    React.createElement('circle', { cx: 12, cy: 15.5, r: 1.5, fill: 'var(--dshp-surface, #fff)' }),
  )
}

/** 时长步进器：纵向小列——相位名在上，[−] 值 [+] 在下；中间数值可点击内联编辑（正整数，Enter/点别处生效，Esc 取消）。 */
export function Stepper(props: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }): React.ReactElement {
  const [editing, setEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState('')
  const cancelRef = React.useRef(false)

  const start = () => {
    cancelRef.current = false
    setEditValue(String(props.value))
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (cancelRef.current) {
      cancelRef.current = false
      return
    }
    const raw = editValue.trim()
    if (!/^\d+$/.test(raw)) return // 只允许正整数
    const n = parseInt(raw, 10)
    if (n < props.min || n > props.max) return
    props.onChange(n)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur() // → onBlur → commit
    } else if (e.key === 'Escape') {
      cancelRef.current = true
      e.currentTarget.blur() // → onBlur → 跳过提交
    }
  }

  const valEl = editing
    ? React.createElement('input', {
        className: 'dshp-stepInput',
        type: 'text',
        inputMode: 'numeric',
        autoFocus: true,
        value: editValue,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value),
        onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
        onBlur: commit,
        onKeyDown,
      })
    : React.createElement('button', {
        type: 'button',
        className: 'dshp-stepVal',
        title: '点击修改（分钟）',
        onClick: start,
      }, props.value)

  return React.createElement('div', { className: 'dshp-step' },
    React.createElement('span', { className: 'dshp-stepLabel' }, props.label),
    React.createElement('div', { className: 'dshp-stepCtl' },
      React.createElement('button', { type: 'button', className: 'dshp-stepBtn', onClick: () => props.onChange(Math.max(props.min, props.value - 1)) }, '−'),
      valEl,
      React.createElement('button', { type: 'button', className: 'dshp-stepBtn', onClick: () => props.onChange(Math.min(props.max, props.value + 1)) }, '+'),
    ),
  )
}

/** 面板小图标统一外壳：单笔描边、圆头（bold 时加粗成水墨笔触）。 */
function lineSvg(children: React.ReactNode, size: number, bold: boolean): React.ReactElement {
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: bold ? 2.4 : 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
  }, children)
}

/** 动作图标：开始（play）/ 暂停（pause）/ 跳过（skip）/ 重置（reset）。 */
export function ActionIcon(props: { kind: 'play' | 'pause' | 'skip' | 'reset'; bold?: boolean }): React.ReactElement {
  const svg = (c: React.ReactNode) => lineSvg(c, 13, props.bold === true)
  switch (props.kind) {
    case 'play':
      return svg(React.createElement('polygon', { points: '6 3 20 12 6 21 6 3' }))
    case 'pause':
      return svg([
        React.createElement('rect', { key: 'a', x: 6, y: 4, width: 4, height: 16, rx: 1 }),
        React.createElement('rect', { key: 'b', x: 14, y: 4, width: 4, height: 16, rx: 1 }),
      ])
    case 'skip':
      return svg([
        React.createElement('polygon', { key: 'p', points: '5 4 15 12 5 20 5 4' }),
        React.createElement('line', { key: 'l', x1: 19, y1: 5, x2: 19, y2: 19 }),
      ])
    case 'reset':
      return svg([
        React.createElement('path', { key: 'a', d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }),
        React.createElement('path', { key: 'b', d: 'M3 3v5h5' }),
      ])
  }
}

/** 环境音图标：无（静音）/ 雨（云雨）/ 海（浪）/ 水（水滴）/ 火（火焰）。 */
export function SoundIcon(props: { kind: 'none' | 'rain' | 'sea' | 'water' | 'fire'; bold?: boolean }): React.ReactElement {
  const svg = (c: React.ReactNode) => lineSvg(c, 13, props.bold === true)
  switch (props.kind) {
    case 'none':
      return svg([
        React.createElement('polygon', { key: 'spk', points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }),
        React.createElement('line', { key: 'x1', x1: 22, y1: 9, x2: 16, y2: 15 }),
        React.createElement('line', { key: 'x2', x1: 16, y1: 9, x2: 22, y2: 15 }),
      ])
    case 'rain':
      return svg([
        React.createElement('path', { key: 'c', d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242' }),
        React.createElement('path', { key: 'd1', d: 'M16 14v6' }),
        React.createElement('path', { key: 'd2', d: 'M8 14v6' }),
        React.createElement('path', { key: 'd3', d: 'M12 16v6' }),
      ])
    case 'sea':
      return svg([
        React.createElement('path', { key: 'w1', d: 'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1' }),
        React.createElement('path', { key: 'w2', d: 'M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1' }),
        React.createElement('path', { key: 'w3', d: 'M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1' }),
      ])
    case 'water':
      return svg(React.createElement('path', { d: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z' }))
    case 'fire':
      return svg(React.createElement('path', { d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' }))
  }
}

/**
 * 进度环：显示剩余比例。从 12 点方向「顺时针消逝」——负 dashoffset 让剩余弧
 * 锚定在 12 点、沿逆时针方向收缩（等价于顺时针被吃掉的洞逐渐扩大），剩左半边；
 * 并加 1s 线性过渡，让每秒 tick 连成连续顺滑的消逝动效（主题无关，颜色走 token）。
 */
export function ProgressRing(props: { ratio: number; size: number; stroke: number; color: string; track: string }): React.ReactElement {
  const r = (props.size - props.stroke) / 2
  const c = 2 * Math.PI * r
  return React.createElement(
    'svg',
    { width: props.size, height: props.size, viewBox: '0 0 ' + props.size + ' ' + props.size, className: 'dshp-ring', 'aria-hidden': true },
    React.createElement('circle', { cx: props.size / 2, cy: props.size / 2, r, fill: 'none', stroke: props.track, strokeWidth: props.stroke }),
    React.createElement('circle', {
      cx: props.size / 2, cy: props.size / 2, r, fill: 'none', stroke: props.color, strokeWidth: props.stroke, strokeLinecap: 'round',
      strokeDasharray: c, strokeDashoffset: -c * (1 - props.ratio),
      transform: 'rotate(-90 ' + props.size / 2 + ' ' + props.size / 2 + ')',
      style: { transition: 'stroke-dashoffset 1s linear' },
    }),
  )
}
