/**
 * dsh-hestia 浏览器半：外观调节（宽度 / 字号 / 皮肤）+ 番茄时钟 + session 置顶/pin + 标识颜色 + 悬停 token 用量 + 会话导航（上箭头 / 时间轴）。
 * 功能按模块拆分在 appearance/、pomodoro/、pin/、color/、usage/、nav/ 下，本文件只做装配：
 * 注入全局 CSS、注册皮肤、挂载两个 slot（外观入口 / 番茄球），并启动列表增强与会话导航。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// type-only：拉取 ui-conversation 的 SlotMap merge（让 slots.register 认识 conversation.* 键）
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import * as React from 'react'

// 声明 shell 的 theme/change 事件（由 dsh-client-ui-theme 提供），让 ctx.on('theme/change') 类型正确。
declare module '@deepseek-ai/cordis' {
  interface Events {
    'theme/change'(snapshot: unknown): void
  }
}

// 声明 shell.overlay slot（由 dsh-client-ui-layout 提供，本包 devDeps 未含该包），让 slots.register('shell.overlay') 类型正确。
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'shell.overlay': {
      kind: 'list'
      scope: 'root'
    }
  }
}

import type { HestiaThemeService } from './theme'
import { CSS } from './styles'
import { AppearancePopover } from './appearance'
import { initSkins } from './appearance/skin'
import { PomodoroBall } from './pomodoro'
import { initSessionPin } from './pin'
import { initColorMark } from './color'
import { initSessionUsage } from './usage'
import { initConversationNav } from './nav'

/** 需要的客户端服务：slots。 */
export const inject: string[] = ['slots']

/** 浏览器插件入口：注入样式、注册皮肤、挂载外观面板 + 番茄钟，并启动列表增强（置顶 / 标识颜色 / 悬停 token 用量）。 */
export function apply(ctx: ClientContext): void {
  const cssTagId = 'dsh-hestia/styles.css'
  if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(cssTagId) + ']') === null) {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-hestia'
    tag.dataset.pluginCss = cssTagId
    tag.textContent = CSS
    document.head.appendChild(tag)
  }

  // 注册全部皮肤并恢复上次选择（localStorage）。third-party 主题 id 是进程内扩展，重启后靠这里重新 setTheme 恢复。
  const theme = ctx.get('theme') as HestiaThemeService | undefined
  initSkins(theme)

  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'hestia-controls',
    order: -1,
  }, () => React.createElement(AppearancePopover, { theme, ctx })))

  // 番茄钟：帧级悬浮层，任何界面可见
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'hestia-pomodoro',
  }, PomodoroBall))

  // session 置顶/pin：订阅 sessions.list + 观察 DOM，注入置顶按钮并重排列表。
  initSessionPin(ctx)

  // session / 工作区 标识颜色：订阅 sessions.list + workspaces.list，注入左侧色条 + 颜色按钮/调色板。
  initColorMark(ctx)

  // session 悬停信息增强：订阅 sessions.list + 观察 DOM，为会话悬停卡注入 token 用量行（输入/输出 tok）。
  initSessionUsage(ctx)

  // 会话导航：滚动到顶「上箭头」+ 右侧「轮次时间轴」（观察会话 DOM + 滚动位置）。
  initConversationNav(ctx)
}
