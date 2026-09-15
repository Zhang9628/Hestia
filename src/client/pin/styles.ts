/**
 * session 置顶/pin 相关 CSS（置顶按钮）。类名前缀 `dshpin-`。
 */
export const PIN_CSS = [
  '.dshpin-btn{display:none;flex:none;align-items:center;justify-content:center;width:16px;height:16px;margin-left:6px;padding:0;cursor:pointer;color:var(--dsw-alias-label-tertiary);background:transparent;border:none;border-radius:4px}',
  '.dshpin-btn svg{display:block}',
  '[class*="sessionRow"]:hover .dshpin-btn{display:inline-flex}',
  '.dshpin-btn:hover{color:var(--dsw-alias-label-primary)}',
  '.dshpin-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
  '.dshpin-btn.is-pinned{display:inline-flex;color:var(--dsw-alias-brand-primary)}',
  '.dshpin-btn.is-pinned path[data-hestia-head]{fill:currentColor}',
].join('')
