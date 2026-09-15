/**
 * session 标识颜色相关 CSS（颜色按钮 + 调色板）。类名前缀 `dshcolor-`。
 */
export const COLOR_CSS = [
  '.dshcolor-btn{display:none;flex:none;width:16px;height:16px;margin-left:6px;padding:0;cursor:pointer;background:var(--hestia-color, transparent);border:1.5px dashed var(--dsw-alias-label-tertiary);border-radius:50%;transition:transform .12s ease}',
  '[class*="sessionRow"]:hover .dshcolor-btn,[class*="projectRow"]:hover .dshcolor-btn{display:inline-flex}',
  '.dshcolor-btn:hover{transform:scale(1.15)}',
  '.dshcolor-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
  '.dshcolor-btn.is-colored{border-style:solid;border-color:var(--dsw-alias-border-l2)}',
  '.dshcolor-palette{position:fixed;z-index:3000;display:none;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l1);box-shadow:0 8px 24px -4px rgba(0,0,0,.2),0 2px 6px rgba(0,0,0,.08)}',
  '.dshcolor-palette.dshcolor-open{display:flex}',
  '.dshcolor-swatches{display:flex;gap:4px}',
  '.dshcolor-swatch{width:20px;height:20px;flex:none;padding:0;cursor:pointer;border-radius:50%;border:1px solid rgba(0,0,0,.18);transition:transform .12s ease}',
  '.dshcolor-swatch:hover{transform:scale(1.18)}',
  '.dshcolor-clear{cursor:pointer;height:22px;flex:none;padding:0 8px;font-size:12px;line-height:1;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:6px}',
  '.dshcolor-clear:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent))}',
].join('')
