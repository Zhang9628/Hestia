/**
 * theme 服务的最小结构视图（运行时由 shell 的 dsh-client-ui-theme 提供）。
 * 皮肤系统只依赖这三个方法，避免在插件里引入完整服务类型。
 */
export interface HestiaThemeService {
  getTheme(): { preference: string; themes: ReadonlyArray<{ id: string }> }
  setTheme(id: string): void
  register(definition: { id: string; colorScheme: 'light' | 'dark'; tokens: Record<string, string> }): () => void
}
