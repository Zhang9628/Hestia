/**
 * 番茄时钟相关 CSS（悬浮球 / 控制面板 / 步进器 / 环境音 / 风格菜单 / 装饰母题）。类名前缀 `dshp-`。
 * 所有颜色/圆角/阴影/字型都读 --dshp-* 组件级 token：
 *   - 基础默认值（classic）挂在 .dshp-root 上，跟随全局 DSH 主题；
 *   - 其余款式由 style.ts 生成的 .dshp-root[data-style=...] 覆盖。
 */
import { POM_THEME_CSS } from './style'

export const POMODORO_CSS = [
  '.dshp-root{position:fixed;right:20px;bottom:20px;z-index:2000;display:flex;flex-direction:column;align-items:flex-end;gap:10px;'
    + '--dshp-accent:var(--dsw-alias-brand-primary);'
    + '--dshp-accent-rest:var(--dsw-alias-state-success-primary);'
    + '--dshp-ball-accent:var(--dshp-accent);'
    + '--dshp-ball-accent-rest:var(--dshp-accent-rest);'
    + '--dshp-ball-track:var(--dsw-alias-border-l2);'
    + '--dshp-ball-ink:var(--dsw-alias-label-primary);'
    + '--dshp-ball-bg:var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));'
    + '--dshp-surface:var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));'
    + '--dshp-surface-2:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);'
    + '--dshp-ink:var(--dsw-alias-label-primary);'
    + '--dshp-ink-2:var(--dsw-alias-label-secondary);'
    + '--dshp-ink-3:var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));'
    + '--dshp-border:var(--dsw-alias-border-l2);'
    + '--dshp-border-strong:var(--dsw-alias-border-l1);'
    + '--dshp-radius:14px;'
    + '--dshp-radius-sm:8px;'
    + '--dshp-radius-xs:6px;'
    + '--dshp-shadow:0 4px 16px rgba(0,0,0,.18);'
    + '--dshp-panel-shadow:0 10px 30px -6px rgba(0,0,0,.2),0 2px 6px rgba(0,0,0,.08);'
    + '--dshp-time-font:inherit;'
    + '--dshp-label-font:inherit}',
  '.dshp-ball{position:relative;width:56px;height:56px;flex:none;cursor:pointer;padding:0;border:none;background:var(--dshp-ball-bg);border-radius:50%;box-shadow:var(--dshp-shadow);transition:transform .12s ease}',
  '.dshp-ball:hover{transform:scale(1.06)}',
  '.dshp-ball:focus-visible{outline:2px solid var(--dshp-ball-accent);outline-offset:2px}',
  '.dshp-ballTime{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;font-family:var(--dshp-time-font);color:var(--dshp-ball-ink)}',
  '.dshp-ring{position:absolute;inset:0}',
  '.dshp-motif{position:absolute;line-height:0;pointer-events:none;user-select:none}',
  '.dshp-motifTop{top:-5px;left:50%;transform:translateX(-50%)}',
  '.dshp-motifLeaf{color:#3d9a50}',
  '.dshp-motifSprout{color:var(--dshp-accent)}',
  '.dshp-motifSeal{right:-3px;bottom:-3px}',
  '.dshp-seal{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:4px;background:#c33b2e;color:#fff;font-size:11px;line-height:1;font-family:"KaiTi","STKaiti","Kaiti SC",serif;transform:rotate(-6deg);box-shadow:0 1px 2px rgba(0,0,0,.22)}',
  '.dshp-panel{position:absolute;bottom:calc(100% + 8px);right:0;width:240px;padding:14px;border-radius:var(--dshp-radius);background:var(--dshp-surface);border:1px solid var(--dshp-border-strong);box-shadow:var(--dshp-panel-shadow);display:flex;flex-direction:column;gap:10px;align-items:center;font-family:var(--dshp-label-font);opacity:0;visibility:hidden;transform:translateY(6px);pointer-events:none;transition:opacity .14s ease,transform .14s ease,visibility .14s}',
  '.dshp-panelOpen{opacity:1;visibility:visible;transform:none;pointer-events:auto}',
  '.dshp-phase{font-size:12px;letter-spacing:.02em;color:var(--dshp-ink-2)}',
  '.dshp-time{font-size:28px;font-weight:600;font-variant-numeric:tabular-nums;font-family:var(--dshp-time-font);color:var(--dshp-ink);line-height:1;background:transparent;border:none;padding:0;cursor:pointer;text-align:center;border-radius:6px}',
  '.dshp-time:hover{color:var(--dshp-accent)}',
  '.dshp-time:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:2px}',
  '.dshp-timeInput{width:92px;font-size:28px;font-weight:600;font-variant-numeric:tabular-nums;font-family:var(--dshp-time-font);color:var(--dshp-ink);line-height:1;text-align:center;background:var(--dshp-surface-2);border:1px solid var(--dshp-accent);border-radius:var(--dshp-radius-xs);padding:2px 4px}',
  '.dshp-timeInput:focus{outline:none}',
  '.dshp-dots{display:flex;gap:6px}',
  '.dshp-dot{width:6px;height:6px;border-radius:50%;background:var(--dshp-border)}',
  '.dshp-dotFill{background:var(--dshp-accent)}',
  '.dshp-actions{display:flex;gap:6px;width:100%}',
  '.dshp-btn{flex:1;cursor:pointer;height:28px;border-radius:var(--dshp-radius-sm);border:1px solid var(--dshp-border);background:transparent;color:var(--dshp-ink-2);font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:4px}',
  '.dshp-btn:hover{background:var(--dshp-surface-2)}',
  '.dshp-btnPrimary{color:var(--dshp-accent);border-color:var(--dshp-accent)}',
  '.dshp-head{display:flex;align-items:center;justify-content:space-between;width:100%}',
  '.dshp-headRight{display:flex;align-items:center;gap:6px;position:relative}',
  '.dshp-lock{cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:var(--dshp-radius-sm);border:1px solid var(--dshp-border);background:transparent;color:var(--dshp-ink-2);padding:0}',
  '.dshp-lock:hover{background:var(--dshp-surface-2)}',
  '.dshp-lockUnlocked{color:var(--dshp-accent);border-color:var(--dshp-accent)}',
  '.dshp-styleRoot{position:relative}',
  '.dshp-style{cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:var(--dshp-radius-sm);border:1px solid var(--dshp-border);background:transparent;color:var(--dshp-ink-2);padding:0}',
  '.dshp-style:hover{background:var(--dshp-surface-2)}',
  '.dshp-style:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:2px}',
  '.dshp-styleOpen{color:var(--dshp-accent);border-color:var(--dshp-accent)}',
  '.dshp-styleMenu{position:absolute;top:calc(100% + 6px);right:0;min-width:132px;padding:4px;border-radius:var(--dshp-radius-sm);background:var(--dshp-surface);border:1px solid var(--dshp-border-strong);box-shadow:var(--dshp-panel-shadow);display:flex;flex-direction:column;gap:2px;opacity:0;visibility:hidden;transform:translateY(-4px);pointer-events:none;transition:opacity .14s ease,transform .14s ease,visibility .14s;z-index:10}',
  '.dshp-styleMenuOpen{opacity:1;visibility:visible;transform:none;pointer-events:auto}',
  '.dshp-styleItem{cursor:pointer;display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:none;border-radius:var(--dshp-radius-xs);background:transparent;color:var(--dshp-ink-2);font-size:12px;line-height:1.4;text-align:left;font-family:var(--dshp-label-font)}',
  '.dshp-styleItem:hover{background:var(--dshp-surface-2);color:var(--dshp-ink)}',
  '.dshp-styleItem:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:-2px}',
  '.dshp-styleItemActive{color:var(--dshp-ink);font-weight:600}',
  '.dshp-styleSwatch{flex:none;width:14px;height:14px;border-radius:50%;border:1px solid var(--dshp-border);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--dshp-ink) 8%, transparent)}',
  '.dshp-styleLabel{white-space:nowrap}',
  '.dshp-divider{width:100%;height:1px;background:var(--dshp-border)}',
  '.dshp-settings{display:flex;flex-direction:column;gap:8px;width:100%}',
  '.dshp-row{display:flex;align-items:center;gap:8px;width:100%}',
  '.dshp-rowLabel{flex:none;width:48px;font-size:12px;letter-spacing:.02em;color:var(--dshp-ink-2)}',
  '.dshp-rowSteps{justify-content:space-between;align-items:flex-start}',
  '.dshp-step{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:12px;color:var(--dshp-ink)}',
  '.dshp-stepLabel{font-size:11px;letter-spacing:.02em;color:var(--dshp-ink-2)}',
  '.dshp-stepCtl{display:flex;align-items:center;gap:3px}',
  '.dshp-stepBtn{cursor:pointer;width:20px;height:20px;border-radius:var(--dshp-radius-xs);border:1px solid var(--dshp-border);background:transparent;color:var(--dshp-ink);font-size:12px;line-height:1;display:inline-flex;align-items:center;justify-content:center;padding:0}',
  '.dshp-stepBtn:hover{background:var(--dshp-surface-2)}',
  '.dshp-stepVal{min-width:22px;height:20px;text-align:center;font-variant-numeric:tabular-nums;font-size:12px;color:var(--dshp-ink);background:transparent;border:none;padding:0;cursor:pointer;line-height:1;border-radius:4px}',
  '.dshp-stepVal:hover{color:var(--dshp-accent)}',
  '.dshp-stepVal:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:1px}',
  '.dshp-stepInput{width:30px;height:20px;text-align:center;font-variant-numeric:tabular-nums;font-size:12px;color:var(--dshp-ink);background:var(--dshp-surface-2);border:1px solid var(--dshp-accent);border-radius:var(--dshp-radius-xs);padding:0 2px;box-sizing:border-box}',
  '.dshp-stepInput:focus{outline:none}',
  '.dshp-sounds{display:flex;gap:4px;flex:1;align-items:stretch}',
  '.dshp-sound{cursor:pointer;flex:1;height:40px;border-radius:var(--dshp-radius-sm);border:1px solid var(--dshp-border);background:transparent;color:var(--dshp-ink-2);padding:0;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}',
  '.dshp-soundLabel{font-size:10px;line-height:1}',
  '.dshp-sound:hover{background:var(--dshp-surface-2)}',
  '.dshp-soundOn{color:var(--dshp-accent);border-color:var(--dshp-accent)}',
  '.dshp-drag{cursor:grab;touch-action:none}',
  '.dshp-drag:active{cursor:grabbing}',
  '.dshp-hint{font-size:11px;letter-spacing:.02em;color:var(--dshp-ink-3)}',
  POM_THEME_CSS,
].join('')
