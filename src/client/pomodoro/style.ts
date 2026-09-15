/**
 * 番茄钟专属「风格款式」系统：只改番茄钟组件自身的视觉，作用域严格限定在 .dshp-root 内，
 * 与全局 DSH 主题（appearance/skin）完全解耦，localStorage 记忆。
 *
 * 布局 / 悬浮球形状 / 进度环形态在所有款式间保持一致；每套款式差异在于：
 *   - 配色 token（--dshp-*）
 *   - 字型（墨=等宽、琥珀=宋体）
 *   - 图标语言：triggerIcon（风格按钮预览图标）、lockIcon（锁图标线稿/实心）、ballMotif（悬浮球装饰母题）
 *
 * 例如：墨 = 水墨/印章风图标（实心锁 + 毛笔 + 红印）；番茄 = 番茄相关图标元素（番茄 + 叶萼）。
 * classic 跟随全局主题（基础默认，不覆盖）——即现状外观。
 */
import * as React from 'react'

export interface PomStyle {
  id: string
  label: string
  /** 下拉清单里的色样（classic 用全局品牌色变量，其余为固定色）。 */
  swatch: string
  /** 覆盖到 .dshp-root 的 --dshp-* token；classic 为空（走基础默认值 = 全局主题）。 */
  tokens: Record<string, string>
  /** 风格切换按钮的预览图标。 */
  triggerIcon?: 'palette' | 'tomato' | 'droplet' | 'brush' | 'sun'
  /** 锁图标形态：line 线稿（默认）/ solid 实心（水墨印章风）。 */
  lockIcon?: 'line' | 'solid'
  /** 悬浮球装饰母题（常显，即使面板收起也在）。 */
  ballMotif?: 'leaf' | 'sprout' | 'seal'
  /** 印章单字（ballMotif='seal' 时）。 */
  sealChar?: string
}

export const POM_STYLE_KEY = 'hestia-pomodoro-style'

export const POM_STYLES: PomStyle[] = [
  {
    id: 'classic',
    label: '经典',
    swatch: 'var(--dsw-alias-brand-primary)',
    triggerIcon: 'palette',
    tokens: {},
  },
  {
    id: 'tomato',
    label: '番茄',
    swatch: '#e5484d',
    triggerIcon: 'tomato',
    ballMotif: 'leaf',
    tokens: {
      '--dshp-accent': '#e5484d',
      '--dshp-accent-rest': '#2f9e6f',
      '--dshp-ball-accent': '#ffffff',
      '--dshp-ball-accent-rest': '#fff2ec',
      '--dshp-ball-track': 'rgba(255,255,255,.34)',
      '--dshp-ball-bg': 'radial-gradient(circle at 32% 26%, #ff8f86, #e5484d 76%)',
      '--dshp-ball-ink': '#ffffff',
      '--dshp-surface': '#fff7f5',
      '--dshp-surface-2': '#ffe6e1',
      '--dshp-ink': '#331614',
      '--dshp-ink-2': '#9a5f58',
      '--dshp-ink-3': '#c29a94',
      '--dshp-border': '#f2d3cc',
      '--dshp-border-strong': '#e9beb4',
      '--dshp-radius': '16px',
      '--dshp-radius-sm': '10px',
      '--dshp-radius-xs': '8px',
      '--dshp-shadow': '0 6px 20px rgba(229,72,77,.28)',
      '--dshp-panel-shadow': '0 12px 32px -8px rgba(229,72,77,.30), 0 2px 6px rgba(229,72,77,.10)',
    },
  },
  {
    id: 'mint',
    label: '薄荷',
    swatch: '#12a594',
    triggerIcon: 'droplet',
    ballMotif: 'sprout',
    tokens: {
      '--dshp-accent': '#12a594',
      '--dshp-accent-rest': '#5b8def',
      '--dshp-ball-accent': '#0b8f81',
      '--dshp-ball-accent-rest': '#5b8def',
      '--dshp-ball-track': '#cfe8df',
      '--dshp-ball-bg': 'linear-gradient(180deg, #ffffff, #d8f2ea)',
      '--dshp-ball-ink': '#14332b',
      '--dshp-surface': '#f4fbf8',
      '--dshp-surface-2': '#e0f3ec',
      '--dshp-ink': '#14332b',
      '--dshp-ink-2': '#4d7a6d',
      '--dshp-ink-3': '#7aa396',
      '--dshp-border': '#cfe8df',
      '--dshp-border-strong': '#b8ded2',
      '--dshp-radius': '18px',
      '--dshp-radius-sm': '10px',
      '--dshp-radius-xs': '8px',
      '--dshp-shadow': '0 6px 20px rgba(18,165,148,.24)',
      '--dshp-panel-shadow': '0 12px 32px -8px rgba(18,165,148,.26), 0 2px 6px rgba(18,165,148,.10)',
    },
  },
  {
    id: 'ink',
    label: '墨',
    swatch: '#111111',
    triggerIcon: 'brush',
    lockIcon: 'solid',
    ballMotif: 'seal',
    sealChar: '勤',
    tokens: {
      '--dshp-accent': '#111111',
      '--dshp-accent-rest': '#7a7a7a',
      '--dshp-ball-accent': '#ffffff',
      '--dshp-ball-accent-rest': '#9a9a9a',
      '--dshp-ball-track': 'rgba(255,255,255,.28)',
      '--dshp-ball-bg': '#111111',
      '--dshp-ball-ink': '#ffffff',
      '--dshp-surface': '#ffffff',
      '--dshp-surface-2': '#f1f1f1',
      '--dshp-ink': '#111111',
      '--dshp-ink-2': '#5c5c5c',
      '--dshp-ink-3': '#8f8f8f',
      '--dshp-border': '#d9d9d9',
      '--dshp-border-strong': '#111111',
      '--dshp-radius': '4px',
      '--dshp-radius-sm': '4px',
      '--dshp-radius-xs': '3px',
      '--dshp-time-font': '"SF Mono", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
      '--dshp-shadow': '0 4px 14px rgba(0,0,0,.22)',
      '--dshp-panel-shadow': '0 12px 28px -8px rgba(0,0,0,.28), 0 1px 3px rgba(0,0,0,.12)',
    },
  },
  {
    id: 'amber',
    label: '琥珀',
    swatch: '#b3541e',
    triggerIcon: 'sun',
    tokens: {
      '--dshp-accent': '#b3541e',
      '--dshp-accent-rest': '#3f7d4e',
      '--dshp-ball-accent': '#b3541e',
      '--dshp-ball-accent-rest': '#3f7d4e',
      '--dshp-ball-track': '#e6d3b0',
      '--dshp-ball-bg': 'linear-gradient(180deg, #fffdf6, #f6e8cf)',
      '--dshp-ball-ink': '#3a2a1a',
      '--dshp-surface': '#fbf3e4',
      '--dshp-surface-2': '#f3e6cc',
      '--dshp-ink': '#3a2a1a',
      '--dshp-ink-2': '#8a6a4a',
      '--dshp-ink-3': '#ab8f6e',
      '--dshp-border': '#e6d3b0',
      '--dshp-border-strong': '#d9c199',
      '--dshp-radius': '8px',
      '--dshp-radius-sm': '6px',
      '--dshp-radius-xs': '5px',
      '--dshp-time-font': '"Songti SC", "STSong", "SimSun", Georgia, "Times New Roman", serif',
      '--dshp-label-font': '"Songti SC", "STSong", Georgia, serif',
      '--dshp-shadow': '0 6px 18px rgba(179,84,30,.22)',
      '--dshp-panel-shadow': '0 12px 28px -8px rgba(179,84,30,.24), 0 2px 6px rgba(179,84,30,.10)',
    },
  },
]

/** 读取上次选择的款式 id。 */
export function loadStyleId(): string {
  try {
    const raw = localStorage.getItem(POM_STYLE_KEY)
    if (raw !== null && POM_STYLES.some((s) => s.id === raw)) return raw
  } catch {
    // ignore
  }
  return 'classic'
}

/** 按 id 取款式（含默认值回退）。 */
export function getStyle(id: string): PomStyle {
  return POM_STYLES.find((s) => s.id === id) ?? POM_STYLES[0]!
}

/** 由 POM_STYLES 生成 .dshp-root[data-style=...] token 覆盖块（classic 为空，走基础默认）。 */
export const POM_THEME_CSS = POM_STYLES
  .map((s) => {
    if (Object.keys(s.tokens).length === 0) return ''
    const body = Object.entries(s.tokens).map(([k, v]) => k + ':' + v).join(';')
    return '.dshp-root[data-style=' + JSON.stringify(s.id) + ']{' + body + '}'
  })
  .join('')

/** 风格切换按钮的预览图标（13px，单笔 2px 描边）。 */
export function TriggerIcon(props: { icon: PomStyle['triggerIcon'] }): React.ReactElement {
  const icon = props.icon ?? 'palette'
  const svg = (children: React.ReactNode) => React.createElement('svg',
    { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    children,
  )

  switch (icon) {
    case 'tomato':
      return svg([
        React.createElement('circle', { key: 'b', cx: 12, cy: 14, r: 6.5 }),
        React.createElement('path', { key: 's', d: 'M12 7.5V4.5' }),
        React.createElement('path', { key: 'l1', d: 'M12 7.5C9.6 7.5 8.2 6.2 7.4 4.2c.1 2 1.7 3.1 4.6 3.3z', fill: 'currentColor', stroke: 'none' }),
        React.createElement('path', { key: 'l2', d: 'M12 7.5c2.4 0 3.8-1.3 4.6-3.3-.1 2-1.7 3.1-4.6 3.3z', fill: 'currentColor', stroke: 'none' }),
      ])
    case 'droplet':
      return svg(React.createElement('path', { d: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z' }))
    case 'brush':
      return svg([
        React.createElement('path', { key: 'h', d: 'm9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08' }),
        React.createElement('path', { key: 'b', d: 'M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z' }),
      ])
    case 'sun':
      return svg([
        React.createElement('circle', { key: 'c', cx: 12, cy: 12, r: 4 }),
        React.createElement('path', { key: 'r', d: 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' }),
      ])
    case 'palette':
    default:
      return svg([
        React.createElement('path', { key: 'p', d: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z' }),
        React.createElement('circle', { key: 'd1', cx: '13.5', cy: '6.5', r: '.5', fill: 'currentColor' }),
        React.createElement('circle', { key: 'd2', cx: '17.5', cy: '10.5', r: '.5', fill: 'currentColor' }),
        React.createElement('circle', { key: 'd3', cx: '8.5', cy: '7.5', r: '.5', fill: 'currentColor' }),
        React.createElement('circle', { key: 'd4', cx: '6.5', cy: '12.5', r: '.5', fill: 'currentColor' }),
      ])
  }
}

/** 悬浮球装饰母题（常显）。 */
export function BallMotif(props: { motif: PomStyle['ballMotif']; sealChar?: string }): React.ReactElement | null {
  const m = props.motif
  if (m === undefined) return null
  if (m === 'seal') {
    return React.createElement('span', { className: 'dshp-motif dshp-motifSeal dshp-seal', 'aria-hidden': true }, props.sealChar ?? '印')
  }
  const cls = m === 'leaf' ? 'dshp-motif dshp-motifTop dshp-motifLeaf' : 'dshp-motif dshp-motifTop dshp-motifSprout'
  const inner = m === 'leaf'
    ? React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'currentColor' },
        React.createElement('path', { d: 'M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26Z' }),
      )
    : React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M7 20h10' }),
        React.createElement('path', { d: 'M10 20c5.5-2.5.8-6.4 3-10' }),
        React.createElement('path', { d: 'M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z' }),
        React.createElement('path', { d: 'M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z' }),
      )
  return React.createElement('span', { className: cls, 'aria-hidden': true }, inner)
}

/** 番茄钟款式切换器：预览图标按钮 + 下拉款式清单（纯展示，状态由父组件持有）。 */
export function StyleSwitcher(props: { styleId: string; onChange: (id: string) => void }): React.ReactElement {
  const { styleId, onChange } = props
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  // 点击外部 / Esc 关闭下拉
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const items = POM_STYLES.map((s) =>
    React.createElement(
      'button',
      {
        type: 'button',
        key: s.id,
        role: 'menuitemradio',
        'aria-checked': s.id === styleId,
        className: 'dshp-styleItem' + (s.id === styleId ? ' dshp-styleItemActive' : ''),
        onClick: () => {
          onChange(s.id)
          setOpen(false)
        },
      },
      React.createElement('span', { className: 'dshp-styleSwatch', style: { background: s.swatch } }),
      React.createElement('span', { className: 'dshp-styleLabel' }, s.label),
    ),
  )

  const trigger = React.createElement(
    'button',
    {
      type: 'button',
      className: 'dshp-style' + (open ? ' dshp-styleOpen' : ''),
      'aria-expanded': open,
      'aria-haspopup': 'menu',
      title: '番茄钟风格',
      onClick: () => setOpen((v) => !v),
    },
    React.createElement(TriggerIcon, { icon: getStyle(styleId).triggerIcon }),
  )

  const menu = React.createElement(
    'div',
    { className: 'dshp-styleMenu' + (open ? ' dshp-styleMenuOpen' : ''), role: 'menu', 'aria-hidden': !open },
    items,
  )

  return React.createElement('div', { className: 'dshp-styleRoot', ref: rootRef }, [trigger, menu])
}
