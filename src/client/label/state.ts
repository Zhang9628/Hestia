/**
 * 「按标签排序」的跨模块开关（模块级信号，非持久化；持久化在 label/sort.ts）。
 *
 * pin 与 label-sort 都想决定侧栏会话顺序：pin 把置顶会话顶到最前，label-sort 把
 * 工作区内的会话按标签重排（并且已经把「置顶优先」纳入自己的比较键）。二者同时
 * 写 host 顺序会互相把对方刚写好的顺序改回去，形成来回抖动。
 *
 * 因此按标签排序开启时，pin 只保留置顶按钮、跳过 DOM 重排与 host 顺序写回，
 * 顺序完全交给 label-sort（它内部仍然保证置顶在最前）。
 */
let active = false

/** label/sort 在启用 / 停用时调用。 */
export function setLabelSortActive(value: boolean): void {
  active = value
}

/** pin 在 refresh / 写回 host 顺序前调用。 */
export function labelSortActive(): boolean {
  return active
}