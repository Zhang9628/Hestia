/**
 * Hestia 自声明的最小客户端上下文 / 服务类型视图。
 *
 * 0.1.5-rc.1 起 `@deepseek-ai/dsh-client-runtime` 与 `@deepseek-ai/dsh-client-ui-slots`
 * 不再作为独立运行时包存在（前者并入 cordis 的 `Context`，后者的运行时实现并入
 * `dsh-client-ui-renderer` 的 `SlotRegistry`）。因此这里不再 import 这些包，改为本地
 * 声明 Hestia 实际用到的最小结构，与运行时真实服务对齐；凡是从 `ctx.get(...)` 拿到的
 * 服务都用 `as` 收窄到各模块自己的最小视图。
 */

/** slots 服务 entry（`entries(key)` 返回的单元）。 */
export interface HestiaSlotEntry {
  options: {
    name?: string
    id?: string
    order?: number
    key?: string
    store?: unknown
    [k: string]: unknown
  }
  store?: unknown
  [k: string]: unknown
}

/** slots 服务最小视图（运行时由 SlotRegistry 提供）。 */
export interface HestiaSlotsService {
  /** 等某个 slot 声明就绪后执行 callback；callback 返回 disposer（`register` 的返回值即可）。 */
  inject(key: string, callback: () => (() => void) | void): () => void
  /** 注册一个 slot entry，返回 disposer。 */
  register(options: HestiaSlotEntry['options'], component: (...args: any[]) => any): () => void
  /** 某 key 已注册 entry 的快照。 */
  entries(key: string): readonly HestiaSlotEntry[]
}

/** Hestia 客户端插件入口上下文（运行时为 cordis 的客户端根 Context）。 */
export interface ClientContext {
  get(name: string): unknown
  on(name: string, callback: (payload: unknown) => void): () => void
  effect(fn: () => void | (() => void)): void
  slots: HestiaSlotsService
}
