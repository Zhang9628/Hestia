/**
 * 「外观」面板：会话页头部的入口按钮 + 弹出面板。
 * 面板内分四组：宽度（width）/ 字号（font）/ 壁纸（background）/ 皮肤（skin）。面板始终挂载、仅用 CSS 隐藏，
 * 关闭弹层后控件及其动态 style 标签仍在，改动持续生效。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import * as React from 'react'
import type { HestiaThemeService } from '../theme'
import { ChatWidthControl } from './width'
import { FontSizeControl } from './font'
import { SkinControl } from './skin'
import { BackgroundImageControl } from './background'

/** 「外观」入口图标：lucide sliders-horizontal，单笔 2px 描边。 */
function SlidersIcon(): React.ReactElement {
  return React.createElement(
    'svg',
    { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    React.createElement('line', { x1: 21, x2: 14, y1: 4, y2: 4 }),
    React.createElement('line', { x1: 10, x2: 3, y1: 4, y2: 4 }),
    React.createElement('line', { x1: 21, x2: 12, y1: 12, y2: 12 }),
    React.createElement('line', { x1: 8, x2: 3, y1: 12, y2: 12 }),
    React.createElement('line', { x1: 21, x2: 16, y1: 20, y2: 20 }),
    React.createElement('line', { x1: 12, x2: 3, y1: 20, y2: 20 }),
    React.createElement('line', { x1: 14, x2: 14, y1: 2, y2: 6 }),
    React.createElement('line', { x1: 8, x2: 8, y1: 10, y2: 14 }),
    React.createElement('line', { x1: 16, x2: 16, y1: 18, y2: 22 }),
  )
}

/** 弹层内一行：左侧小标签 + 控件。 */
function Group(props: React.PropsWithChildren<{ label: string }>): React.ReactElement {
  return React.createElement('div', { className: 'dshwc-group' },
    React.createElement('span', { className: 'dshwc-groupLabel' }, props.label),
    props.children,
  )
}

/** 单个「外观」入口按钮 + 弹出面板（宽度 / 字号 / 壁纸 / 皮肤四组）。 */
export function AppearancePopover(props: { theme: HestiaThemeService | undefined; ctx: ClientContext }): React.ReactElement {
  const { theme, ctx } = props
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  // 点击外部 / Esc 关闭
  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const trigger = React.createElement(
    'button',
    {
      type: 'button',
      className: 'dshwc-popTrigger' + (open ? ' dshwc-popTriggerOpen' : ''),
      'aria-expanded': open,
      'aria-haspopup': 'dialog',
      title: '外观设置（宽度 / 字号 / 壁纸 / 皮肤）',
      onClick: () => setOpen((v) => !v),
    },
    React.createElement(SlidersIcon),
    React.createElement('span', null, '外观'),
  )

  // 面板始终挂载、仅用 CSS 隐藏：关闭弹层后控件及其 style 标签仍在，改动持续生效。
  const panel = React.createElement('div', {
    className: 'dshwc-panel' + (open ? ' dshwc-panelOpen' : ''),
    role: 'dialog',
    'aria-hidden': !open,
  },
    React.createElement(Group, { label: '宽度' }, React.createElement(ChatWidthControl)),
    React.createElement(Group, { label: '字号' }, React.createElement(FontSizeControl)),
    React.createElement(Group, { label: '壁纸' }, React.createElement(BackgroundImageControl)),
    React.createElement(Group, { label: '皮肤' }, React.createElement(SkinControl, { theme, ctx })),
  )

  return React.createElement('div', { className: 'dshwc-pop', ref: rootRef }, [trigger, panel])
}
