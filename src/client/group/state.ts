/**
 * 按标识颜色分组的跨模块开关（模块级信号，非持久化）。
 *
 * pin 与 color-grouping 是两种互相竞争的侧栏重排行为：pin 想把置顶会话排到
 * 整个列表最前，color-grouping 想把会话按颜色归组。二者不能同时生效，否则
 * 各自的 MutationObserver 会互相把对方刚排好的顺序打乱，形成无限 rAF 振荡。
 * 因此用一个模块级布尔量在二者间协调：grouping 开启时 pin 只保留置顶按钮、
 * 跳过重排与 store 顺序写回。
 */
let active = false

/** group 模块在启用/停用分组时调用。 */
export function setColorGroupingActive(value: boolean): void {
  active = value
}

/** pin 模块在 refresh 时调用，决定是否跳过重排。 */
export function colorGroupingActive(): boolean {
  return active
}
