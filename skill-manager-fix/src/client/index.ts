/**
 * dsh-skill-manager 浏览器半：设置 →「技能管理」页面。
 *
 * 数据通路（v3，纯全局）：
 *   - host 半在 client-connection 通用 RPC 通道 `/skill-manager` 上暴露
 *     list / create / remove 三个端点（全局 skill 增删查）。
 *   - 本半只做 UI：搜索框 + 列表 + 新建表单 + 删除按钮，
 *     全部通过 `connection.rpc.call('/skill-manager', …)` 通信。
 *
 * 注册 `settings.section` slot（id: skills, order: 15），与「通用设置 / 模型」
 * 同级出现在设置页导航。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import * as React from 'react'
import { CSS } from './styles'
import { SkillManagerSection } from './section'

// settings.section 由 dsh-client-ui-settings 声明；本包 devDeps 未含该包，
// 手动拉取 SlotMap merge（与 Hestia 声明 shell.overlay 同套路）。
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'settings.section': {
      kind: 'list'
      scope: 'root'
    }
  }
}

/** 需要的客户端服务：slots（注册 slot）+ connection（host RPC 通道）。 */
export const inject: string[] = ['slots', 'connection']

/** 浏览器插件入口：注入样式、注册设置页「技能管理」section。 */
export function apply(ctx: ClientContext): void {
  const cssTagId = 'dsh-skill-manager/styles.css'
  if (typeof document !== 'undefined' && !document.querySelector('style[data-plugin-css=' + JSON.stringify(cssTagId) + ']')) {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-skill-manager'
    tag.dataset.pluginCss = cssTagId
    tag.textContent = CSS
    document.head.appendChild(tag)
  }

  const connection = ctx.get('connection')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'skills',
    order: 15,
    label: () => '技能管理',
    inject: () => ({ rpc: connection.rpc }),
  }, SkillManagerSection))
}