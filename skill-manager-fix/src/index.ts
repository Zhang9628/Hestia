/**
 * dsh-skill-manager host 半：全局 skill 管理（增 / 删 / 查）。
 *
 * 通过 client-connection 的 `/api` 通道（Connection 精确 Fetch 路由）暴露三个端点：
 *   - list   ：POST /api/skill-manager/list
 *   - create ：POST /api/skill-manager/create
 *   - remove ：POST /api/skill-manager/remove
 *
 * 正确写法（新版 dsh）：用顶层 `inject` 声明依赖，让插件等 `connection` /
 * `skills` 服务就绪后再激活；apply 里直接用 `ctx.connection`（依赖链上已
 * 注入），再用 `ctx.effect` 注册路由（随 fiber 一起卸载）。
 *
 * 为什么不继续用 `connection.rpc.handle('/skill-manager', …)`：
 *   client-connection 的 `rpc.handle` 在挂自定义通道时会访问 `owner.webServer`
 *   （owner 是 client-connection 自身 ctx，其 fiber 依赖链上没有 webServer），
 *   抛 `cannot get property "webServer" without inject`，通道永远挂不上。而
 *   `/api` 通道的精确 Fetch 路由由 connection 自己挂载的 /api 前缀路由分发，
 *   不经过 webServer 注入，稳定可用。
 *
 * 信任策略 loopback：/api 前缀路由自带 Host/Origin 检查 + 浏览器鉴权。
 */
import { promises as fsp } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { SkillDefinition, SkillRegistry, SkillSource } from '@deepseek-ai/dsh-skill'

export const name = 'dsh-skill-manager'
export const inject = ['connection', 'skills']

/** RPC 结果形状（与 client-connection 的 ConnectionRpcResult 对齐）。 */
type ConnectionRpcResult =
  | { ok: true; value: unknown }
  | { ok: false; error: { code: string; message: string; details: Record<string, unknown> } }

/** Connection 精确 Fetch 路由（host 半，手写最小类型，避免锁旧版 devDeps）。 */
interface ConnectionFetchRoute {
  path: string
  methods: readonly ('GET' | 'HEAD' | 'POST')[]
  requestBody: 'buffered' | 'streaming'
  fetch: (request: Request) => Promise<Response>
}
interface ConnectionHandle {
  fetch: { register(route: ConnectionFetchRoute): () => Promise<void> }
}

/** host 半的 apply 上下文：`connection` / `skills` 由 `inject` 声明保证就绪。 */
type HostContext = Context & { connection: ConnectionHandle; skills: SkillRegistry }

/** RpcResult 成功值。 */
function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value }
}
function fail(code: string, message: string): { ok: false; error: { code: string; message: string; details: Record<string, unknown> } } {
  return { ok: false, error: { code, message, details: {} } }
}

/** 可删除的 source（用户级 / 自定义）；bundled / project / runtime 一律拒绝。 */
const REMOVABLE_SOURCES: ReadonlySet<SkillSource> = new Set(['user-dsh', 'user-agents', 'custom'])

/** 不可删除时的原因；可删返回 null。 */
function removableReason(source: SkillSource): string | null {
  if (REMOVABLE_SOURCES.has(source)) return null
  if (source === 'bundled') return '内置 skill 不可删除'
  if (source === 'project-dsh' || source === 'project-agents') return '项目级 skill 不可删除（只管理全局）'
  return '该来源（' + String(source) + '）的 skill 不可删除'
}

/** 写出一个可被 filesystem provider 解析的 SKILL.md（frontmatter 必须含 name/description）。 */
async function writeSkillFile(
  target: string,
  fields: { name: string; description: string; whenToUse?: string },
): Promise<void> {
  const front = [
    '---',
    'name: ' + JSON.stringify(fields.name),
    'description: ' + JSON.stringify(fields.description),
    ...(fields.whenToUse ? ['whenToUse: ' + JSON.stringify(fields.whenToUse)] : []),
    '---',
    '',
  ].join('\n')
  const body = '# ' + fields.name + '\n\n' + fields.description + '\n'
  await fsp.mkdir(dirname(target), { recursive: true })
  await fsp.writeFile(target, front + body, 'utf8')
}

/**
 * 把一个「解码后的 RPC 处理器」包装成 /api 下的精确 Fetch 路由：
 * 解析 client-request 信封 → 调 handler → 回 server-response 信封。
 */
function rpcRoute(path: string, run: (payload: unknown) => Promise<ConnectionRpcResult>): ConnectionFetchRoute {
  return {
    path,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request: Request): Promise<Response> => {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return Response.json({ type: 'server-response', rpcId: '', result: fail('INVALID_ENVELOPE', 'body is not JSON') })
      }
      const envelope = body as { type?: unknown; rpcId?: unknown; payload?: unknown }
      const rpcId = typeof envelope.rpcId === 'string' ? envelope.rpcId : ''
      if (envelope.type !== 'client-request' || !rpcId) {
        return Response.json({
          type: 'server-response',
          rpcId: rpcId || 'invalid-request',
          result: fail('INVALID_ENVELOPE', 'invalid client-request message'),
        })
      }
      try {
        const result = await run(envelope.payload)
        return Response.json({ type: 'server-response', rpcId, result })
      } catch (e) {
        return Response.json({ type: 'server-response', rpcId, result: fail('INTERNAL', e instanceof Error ? e.message : String(e)) })
      }
    },
  }
}

export function apply(ctx: HostContext): void {
  ctx.effect(() => ctx.connection.fetch.register(rpcRoute('/api/skill-manager/list', () => handleList(ctx.skills))), 'dsh-skill-manager: list route')
  ctx.effect(() => ctx.connection.fetch.register(rpcRoute('/api/skill-manager/create', (payload) => handleCreate(ctx.skills, payload))), 'dsh-skill-manager: create route')
  ctx.effect(() => ctx.connection.fetch.register(rpcRoute('/api/skill-manager/remove', (payload) => handleRemove(ctx.skills, payload))), 'dsh-skill-manager: remove route')
}

/** 全局 skill 目录（不含项目根）。 */
async function handleList(skills: SkillRegistry): Promise<ConnectionRpcResult> {
  const summaries = await skills.list()
  const out = summaries.map((s) => ({
    name: s.name,
    description: s.description,
    whenToUse: s.whenToUse,
    modelInvocable: s.invocation.modelInvocable,
    userInvocable: s.invocation.userInvocable,
    source: s.source,
    provider: s.provider,
    removable: removableReason(s.source),
  }))
  return ok({ skills: out })
}

interface CreatePayload {
  name?: unknown
  description?: unknown
  whenToUse?: unknown
}

/** 新建 user-dsh skill → $DSH_HOME/skills/<name>/SKILL.md。 */
async function handleCreate(skills: SkillRegistry, payload: unknown): Promise<ConnectionRpcResult> {
  const p = (payload ?? {}) as CreatePayload
  const name = typeof p.name === 'string' ? p.name.trim() : ''
  const description = typeof p.description === 'string' ? p.description.trim() : ''
  const whenToUse = typeof p.whenToUse === 'string' && p.whenToUse.trim() ? p.whenToUse.trim() : undefined

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    return fail('INVALID_NAME', 'skill 名称必须是 kebab-case（小写字母/数字/连字符）')
  }
  if (!description) return fail('INVALID_DESCRIPTION', 'description 不能为空')
  const existing = await skills.get(name)
  if (existing) return fail('EXISTS', 'skill「' + name + '」已存在（source: ' + existing.source + '）')

  const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  const target = join(dshHome, 'skills', name, 'SKILL.md')
  await writeSkillFile(target, { name, description, whenToUse })
  return ok({ name, path: target })
}

interface RemovePayload {
  name?: unknown
}

/** 删除 skill（仅 user-dsh / user-agents / custom）。 */
async function handleRemove(skills: SkillRegistry, payload: unknown): Promise<ConnectionRpcResult> {
  const p = (payload ?? {}) as RemovePayload
  const name = typeof p.name === 'string' ? p.name.trim() : ''
  if (!name) return fail('INVALID_NAME', '缺少 skill 名称')

  const def: SkillDefinition | undefined = await skills.get(name)
  if (!def) return fail('NOT_FOUND', 'skill「' + name + '」不存在')
  const reason = removableReason(def.source)
  if (reason) return fail('NOT_REMOVABLE', reason)
  if (!def.path) return fail('NO_PATH', 'skill「' + name + '」没有可删除的文件路径（source: ' + def.source + '）')

  // 目录束 skill 删除整个目录（def.path 指向 SKILL.md）
  const target = def.path.endsWith('/SKILL.md') ? dirname(def.path) : def.path
  await fsp.rm(target, { recursive: true })
  return ok({ name, removed: true, path: target })
}

export default apply
