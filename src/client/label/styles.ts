/**
 * 会话标签相关 CSS：行内「颜色点 + 【文案】」胶囊、行尾标签按钮、编辑弹层、
 * 「按标签」排序菜单项。类名前缀 `dshlabel-`。
 */
export const LABEL_CSS = [
  // —— 行内标签：颜色点 + 文案胶囊（颜色来自标签实体）——
  '.dshlabel{display:inline-flex;align-items:center;gap:5px;flex:none;min-width:0;max-width:46%;margin-right:7px;vertical-align:middle}',
  '.dshlabel-dot{width:8px;height:8px;flex:none;border-radius:50%;background:var(--hestia-label-color,#6b7280);box-shadow:0 0 0 2px color-mix(in srgb, var(--hestia-label-color,#6b7280) 20%, transparent)}',
  '.dshlabel-pill{min-width:0;padding:0 5px;font-size:11px;line-height:16px;border-radius:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--hestia-label-color,#6b7280);background:color-mix(in srgb, var(--hestia-label-color,#6b7280) 16%, transparent)}',

  // —— 行尾标签按钮（hover 显示）——
  '.dshlabel-btn{display:none;flex:none;align-items:center;justify-content:center;width:16px;height:16px;margin-left:6px;padding:0;cursor:pointer;color:var(--dsw-alias-label-tertiary);background:transparent;border:none;border-radius:4px}',
  '.dshlabel-btn svg{display:block}',
  '[class*="sessionRow"]:hover .dshlabel-btn{display:inline-flex}',
  '.dshlabel-btn:hover{color:var(--dsw-alias-label-primary)}',
  '.dshlabel-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
  '.dshlabel-btn.is-labeled{display:inline-flex;color:var(--hestia-label-color,#6b7280)}',

  // —— 编辑弹层 ——
  '.dshlabel-pop{position:fixed;z-index:3001;display:none;flex-direction:column;gap:8px;width:288px;padding:10px 12px 12px;border-radius:10px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l1);box-shadow:0 12px 32px -8px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.1)}',
  '.dshlabel-pop.dshlabel-open{display:flex}',
  '.dshlabel-pop-head{display:flex;align-items:center;justify-content:space-between}',
  '.dshlabel-pop-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.dshlabel-pop-close{width:20px;height:20px;padding:0;cursor:pointer;color:var(--dsw-alias-label-tertiary);background:transparent;border:none;border-radius:4px;font-size:14px;line-height:1}',
  '.dshlabel-pop-close:hover{color:var(--dsw-alias-label-primary)}',
  '.dshlabel-swatches{display:flex;gap:6px}',
  '.dshlabel-swatch{width:20px;height:20px;flex:none;padding:0;cursor:pointer;border-radius:50%;border:1px solid rgba(0,0,0,.18);transition:transform .12s ease}',
  '.dshlabel-swatch:hover{transform:scale(1.15)}',
  '.dshlabel-swatch.is-selected{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px}',
  '.dshlabel-input{width:100%;height:28px;box-sizing:border-box;padding:0 8px;font:inherit;font-size:12px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2,color-mix(in srgb, currentColor 6%, transparent));border:1px solid var(--dsw-alias-border-l2);border-radius:6px;outline:none}',
  '.dshlabel-input:focus{border-color:var(--dsw-alias-brand-primary)}',
  '.dshlabel-input::placeholder{color:var(--dsw-alias-label-tertiary)}',
  '.dshlabel-hint{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary)}',
  '.dshlabel-chips-title{font-size:10px;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary)}',
  '.dshlabel-chips{display:flex;flex-wrap:wrap;gap:6px;max-height:78px;overflow-y:auto}',
  '.dshlabel-chips-empty{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}',
  '.dshlabel-chip{height:20px;padding:0 8px;cursor:pointer;font-size:11px;line-height:1;border-radius:10px;color:var(--hestia-label-color,#6b7280);background:color-mix(in srgb, var(--hestia-label-color,#6b7280) 14%, transparent);border:1px solid color-mix(in srgb, var(--hestia-label-color,#6b7280) 35%, transparent)}',
  '.dshlabel-chip:hover{background:color-mix(in srgb, var(--hestia-label-color,#6b7280) 24%, transparent)}',
  '.dshlabel-pop-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:2px}',
  '.dshlabel-remove{height:26px;padding:0 10px;cursor:pointer;font-size:11px;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:6px}',
  '.dshlabel-remove:hover{color:var(--dsw-alias-label-primary)}',
  '.dshlabel-save{height:26px;padding:0 14px;cursor:pointer;font-size:11px;font-weight:600;color:#fff;background:var(--dsw-alias-brand-primary);border:none;border-radius:6px}',
  '.dshlabel-save:hover{filter:brightness(1.06)}',

  // —— 「按标签」排序菜单项 ——
  // 克隆 shell 菜单项类名是增强项（Menu 的 CSS Module 在某些构建里是空 stub），
  // 因此这里写一份独立样式，保证注入项永远像一个正常的菜单项。
  '.dshlabel-sort-item{display:flex;align-items:center;gap:8px;width:100%;height:30px;padding:0 8px;font-size:12.5px;line-height:1;text-align:left;cursor:pointer;color:var(--dsw-alias-label-primary);background:transparent;border:none;border-radius:6px}',
  '.dshlabel-sort-item:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,currentColor 10%,transparent))}',
  '.dshlabel-sort-item:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
  '.dshlabel-sort-name{flex:1;white-space:nowrap}',
  '.dshlabel-sort-check{flex:none;font-size:12px;color:var(--dsw-alias-brand-primary);visibility:hidden}',
  '.dshlabel-sort-item.is-active .dshlabel-sort-check{visibility:visible}',
].join('')