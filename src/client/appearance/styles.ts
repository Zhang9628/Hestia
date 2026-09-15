/**
 * 「外观」面板相关 CSS（宽度滑块 / 字号 / segmented 预设 / 弹出面板）。
 * 类名前缀 `dshwc-`，由入口在单个 <style> 标签里统一注入。
 */
export const APPEARANCE_CSS = [
  '.dshwc-root{display:flex;align-items:center;gap:10px;height:28px;padding:0 2px;font-size:12px;line-height:1;color:var(--dsw-alias-label-secondary);user-select:none}',
  '.dshwc-seg{display:inline-flex;align-items:center;gap:2px;flex:none;padding:2px;border-radius:9px;background:var(--dsw-alias-bg-layer-2, color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent))}',
  '.dshwc-segItem{cursor:pointer;color:var(--dsw-alias-label-secondary);background:transparent;border:none;border-radius:7px;padding:2px 8px;font-size:12px;line-height:1.4;white-space:nowrap;transition:color .12s ease,background-color .12s ease,box-shadow .12s ease}',
  '.dshwc-segItem:hover{color:var(--dsw-alias-label-primary)}',
  '.dshwc-segItemActive{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-overlay));box-shadow:0 1px 2px rgba(0,0,0,.14)}',
  '.dshwc-sliderWrap{position:relative;width:132px;height:20px;flex:none}',
  '.dshwc-sliderWrap .dshwc-range{position:absolute;inset:0;width:100%;height:100%;margin:0}',
  '.dshwc-range{-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer}',
  '.dshwc-range::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:transparent}',
  '.dshwc-range::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-brand-primary);border:none;margin-top:-5px}',
  '.dshwc-range::-moz-range-track{height:4px;border-radius:2px;background:transparent}',
  '.dshwc-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-brand-primary);border:none}',
  '.dshwc-track{position:absolute;left:7px;right:7px;top:50%;height:4px;margin-top:-2px;border-radius:2px;background:var(--dsw-alias-border-l2);pointer-events:none}',
  '.dshwc-value{min-width:52px;text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}',
  '.dshwc-pop{position:relative}',
  '.dshwc-popTrigger{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 8px;cursor:pointer;font-size:12px;line-height:1;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;transition:color .15s ease,border-color .15s ease,background-color .15s ease}',
  '.dshwc-popTrigger:hover{background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent))}',
  '.dshwc-popTrigger:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
  '.dshwc-popTriggerOpen{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}',
  '.dshwc-panel{position:absolute;top:calc(100% + 8px);right:0;z-index:1000;display:flex;flex-direction:column;gap:14px;padding:14px 16px;border-radius:14px;background:var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l1);box-shadow:0 10px 30px -6px rgba(0,0,0,.2),0 2px 6px rgba(0,0,0,.08);opacity:0;visibility:hidden;transform:translateY(-4px) scale(.98);pointer-events:none;transition:opacity .14s ease,transform .14s ease,visibility .14s}',
  '.dshwc-panelOpen{opacity:1;visibility:visible;transform:none;pointer-events:auto}',
  '.dshwc-group{display:flex;align-items:center;gap:14px}',
  '.dshwc-groupLabel{flex:none;width:32px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
  '.dshwc-font{cursor:pointer;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;height:28px;padding:0 6px;font-size:12px;line-height:1}',
].join('')
