/**
 * 会话导航（上箭头 + 轮次时间轴）的 CSS。
 *
 * 设计要点：
 * - 上箭头复刻系统「下箭头」（toBottom）的外观：34×34 圆形、1px 边框、悬浮底色、阴影，
 *   全部走 DSH 主题 alias token，纯黑/纯白皮肤下自动适配。
 * - 时间轴是固定在会话视口右缘的一条细竖线 + 每轮一个小圆点；轨道本身 pointer-events:none
 *   不挡正文，圆点 pointer-events:auto 可点。
 * - 圆点 hover / 激活态用 DeepSeek 品牌蓝 `--dsw-static-deepseek-500` 高亮放大。
 */
export const NAV_CSS = `
.dshnav-up {
  position: fixed;
  z-index: 8;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 100px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-button-floating-fill);
  box-shadow: var(--dsw-shadow-lv2);
  cursor: pointer;
}
.dshnav-up:hover {
  background: var(--dsw-alias-button-floating-hover);
}
.dshnav-up:focus-visible {
  outline: 2px solid var(--dsw-static-deepseek-500, #3b82f6);
  outline-offset: 2px;
}

.dshnav-rail {
  position: fixed;
  z-index: 8;
  width: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}
.dshnav-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
  border-radius: 1px;
  background: var(--dsw-alias-border-l2, rgba(127, 127, 127, 0.35));
}
.dshnav-dot {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 9px;
  height: 9px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 50%;
  background: var(--dsw-alias-label-secondary, #9ca3af);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
}
.dshnav-dot:hover,
.dshnav-dot.is-active {
  background: var(--dsw-static-deepseek-500, #3b82f6);
  border-color: var(--dsw-static-deepseek-500, #3b82f6);
  transform: translate(-50%, -50%) scale(1.45);
}
.dshnav-tip {
  position: fixed;
  z-index: 9;
  max-width: 300px;
  padding: 8px 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-surface-l2, #ffffff);
  box-shadow: var(--dsw-shadow-lv2);
  pointer-events: none;
}
.dshnav-tip-summary {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}
.dshnav-tip-time {
  margin-top: 4px;
  color: var(--dsw-alias-label-secondary, #9ca3af);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}
`
