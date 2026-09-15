/**
 * 皮肤系统：纯黑 / 纯白。
 * 皮肤 id 通过 theme.setTheme 切换，localStorage 记忆。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import * as React from 'react'
import type { HestiaThemeService } from '../theme'

/** 一套皮肤 = 配色 token 覆盖表（浅 / 深）。 */
interface HestiaSkin {
  id: string
  label: string
  scheme: 'light' | 'dark'
  tokens: Record<string, string>
}

const SKIN_STORAGE_KEY = 'hestia-skin'
const DEFAULT_SKIN_ID = 'hestia-white'

/** 纯黑：dark 配色 + 全黑背景 / 白字。 */
const SKIN_BLACK: HestiaSkin = {
  id: 'hestia-black',
  label: '纯黑',
  scheme: 'dark',
  tokens: {
    '--dsw-alias-bg-base': '#000000',
    '--dsw-alias-bg-layer-1': '#000000',
    '--dsw-alias-bg-layer-2': '#0d0d0d',
    '--dsw-alias-bg-overlay': '#000000',
    '--dsw-alias-border-l1': '#1f1f1f',
    '--dsw-alias-border-l2': '#2e2e2e',
    '--dsw-alias-label-primary': '#ffffff',
    '--dsw-alias-label-secondary': '#9ca3af',
    '--dsw-specific-sidebar-fill': '#000000',
  },
}

/** 纯白：light 配色 + 全白背景 / 黑字。 */
const SKIN_WHITE: HestiaSkin = {
  id: 'hestia-white',
  label: '纯白',
  scheme: 'light',
  tokens: {
    '--dsw-alias-bg-base': '#ffffff',
    '--dsw-alias-bg-layer-1': '#ffffff',
    '--dsw-alias-bg-layer-2': '#f7f7f7',
    '--dsw-alias-bg-overlay': '#ffffff',
    '--dsw-alias-border-l1': '#e5e7eb',
    '--dsw-alias-border-l2': '#d1d5db',
    '--dsw-alias-label-primary': '#000000',
    '--dsw-alias-label-secondary': '#6b7280',
    '--dsw-specific-sidebar-fill': '#ffffff',
  },
}

/** 皮肤清单（顺序 = 选择器顺序）。 */
const SKINS: HestiaSkin[] = [SKIN_WHITE, SKIN_BLACK]

/** 读取上次选择的皮肤 id；兼容旧版纯黑/纯白（hestia-page-theme）。 */
function loadSkinId(): string {
  try {
    const raw = localStorage.getItem(SKIN_STORAGE_KEY)
    if (raw !== null && SKINS.some((s) => s.id === raw)) return raw
    if (localStorage.getItem('hestia-page-theme') === 'black') return SKIN_BLACK.id
  } catch {
    // ignore
  }
  return DEFAULT_SKIN_ID
}

/** 皮肤选择器（外观弹层内）：segmented 预设，localStorage 记忆。 */
export function SkinControl(props: { theme: HestiaThemeService | undefined; ctx: ClientContext }): React.ReactElement {
  const { theme, ctx } = props
  const [skinId, setSkinId] = React.useState<string>(loadSkinId)

  // 与外部主题切换（设置 → 外观）保持状态同步
  React.useEffect(() => {
    const sync = () => {
      const pref = theme?.getTheme().preference
      if (pref !== undefined && SKINS.some((s) => s.id === pref)) setSkinId(pref)
    }
    const off = ctx.on('theme/change', sync)
    return () => {
      off()
    }
  }, [theme, ctx])

  const pick = (skin: HestiaSkin) => {
    setSkinId(skin.id)
    try {
      theme?.setTheme(skin.id)
      localStorage.setItem(SKIN_STORAGE_KEY, skin.id)
    } catch {
      // ignore
    }
  }

  const buttons = SKINS.map((s) =>
    React.createElement(
      'button',
      {
        type: 'button',
        key: s.id,
        className: 'dshwc-segItem' + (s.id === skinId ? ' dshwc-segItemActive' : ''),
        'aria-pressed': s.id === skinId,
        title: '切换到「' + s.label + '」皮肤',
        onClick: () => pick(s),
      },
      s.label,
    ),
  )
  return React.createElement('div', { className: 'dshwc-seg' }, buttons)
}

/**
 * 注册全部皮肤并恢复上次选择。
 * 皮肤 id 是进程内扩展，重启后靠这里重新 register + setTheme 恢复。
 */
export function initSkins(theme: HestiaThemeService | undefined): void {
  if (theme === undefined) return
  const ids = theme.getTheme().themes.map((t) => t.id)
  for (const skin of SKINS) {
    if (!ids.includes(skin.id)) theme.register({ id: skin.id, colorScheme: skin.scheme, tokens: skin.tokens })
  }
  const stored = loadSkinId()
  theme.setTheme(stored)
}
