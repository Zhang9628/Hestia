/**
 * 按标识颜色分组相关 CSS：注入的「按标识颜色」菜单项 + 颜色组头。类名前缀 `dshgroup-`。
 */
export const GROUP_CSS = [
  // 注入的菜单项：跟随 shell Menu 项布局（克隆兄弟项 className），这里只补自身状态。
  '.dshgroup-menu-item{display:flex;align-items:center;gap:8px}',
  '.dshgroup-menu-item .dshgroup-check{margin-left:auto;font-size:12px;color:var(--dsw-alias-brand-primary);visibility:hidden}',
  '.dshgroup-menu-item.is-active .dshgroup-check{visibility:visible}',
  '.dshgroup-menu-item .dshgroup-dot{width:10px;height:10px;flex:none;border-radius:50%;background:conic-gradient(#ef4444 0 45deg,#f97316 45deg 90deg,#eab308 90deg 135deg,#22c55e 135deg 180deg,#3b82f6 180deg 225deg,#8b5cf6 225deg 270deg,#ec4899 270deg 315deg,#6b7280 315deg 360deg);border:1px solid rgba(0,0,0,.15)}',
  // 颜色组头：仿 shell 分组头（小字、次级色），插在 flatList 容器内。
  '.dshgroup-header{display:flex;align-items:center;gap:6px;height:24px;padding:0 10px;margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1;letter-spacing:.02em;white-space:nowrap;overflow:hidden;user-select:none}',
  '.dshgroup-header .dshgroup-dot{width:9px;height:9px;flex:none;border-radius:50%;background:var(--dshgroup-color, #6b7280);border:1px solid rgba(0,0,0,.18)}',
  '.dshgroup-header .dshgroup-name{flex:none}',
  '.dshgroup-header .dshgroup-count{margin-left:auto;opacity:.8;font-variant-numeric:tabular-nums}',
].join('')
