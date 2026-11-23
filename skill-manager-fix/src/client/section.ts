/**
 * 「技能管理」设置页组件（settings.section id: skills）。
 *
 * v3：纯全局视图。只保留：
 *   - 全局 skill 列表（host 半 /api/skill-manager/list，含 source / removable）
 *   - 搜索框（名称 / 描述 / 适用场景）
 *   - 新建 skill（写 ~/.dsh/skills/<name>/SKILL.md）
 *   - 删除 skill（仅 user-dsh / user-agents / custom 源）
 * 不再与任何具体会话挂钩。
 */
import * as React from 'react'
import type { SkillsApi } from '@deepseek-ai/dsh-client-connection/client'

/** 组件的注入面（register 的 inject 返回对象 + shell 传的 close）。 */
export interface SkillManagerSectionProps {
  api?: { skills: SkillsApi }
  rpc?: ClientRpcLike
  close?: () => void
}

/** client-connection rpc 的最小结构。 */
interface ClientRpcLike {
  call(channel: string, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<RpcResultLike>
}

type RpcResultLike =
  | { ok: true; value: unknown }
  | { ok: false; error: { code: string; message: string } }

interface SkillEntry {
  name: string
  description: string
  whenToUse?: string
  modelInvocable: boolean
  source: string
  removable: string | null
}

/** 来源徽章展示文本 + 颜色类别。 */
function sourceMeta(source: string): { label: string; cls: string } {
  switch (source) {
    case 'user-dsh': return { label: '~/.dsh', cls: 'dshsk-srcUser' }
    case 'user-agents': return { label: '~/.agents', cls: 'dshsk-srcUser' }
    case 'bundled': return { label: '内置', cls: 'dshsk-srcBundled' }
    case 'project-dsh': return { label: '项目 .dsh', cls: 'dshsk-srcProject' }
    case 'project-agents': return { label: '项目 .agents', cls: 'dshsk-srcProject' }
    case 'custom': return { label: '自定义', cls: 'dshsk-srcCustom' }
    default: return { label: source, cls: 'dshsk-srcCustom' }
  }
}

/** 徽章：模型可用 / 仅用户可用。 */
function InvocationBadge(props: { modelInvocable: boolean }): React.ReactElement {
  return React.createElement(
    'span',
    {
      className: props.modelInvocable ? 'dshsk-badge dshsk-badgeModel' : 'dshsk-badge dshsk-badgeUser',
      title: props.modelInvocable ? '模型与用户均可调用' : '仅用户可调用（/名称）',
    },
    props.modelInvocable ? '模型可用' : '仅用户',
  )
}

/** 空态 / 加载 / 错误提示行。 */
function Notice(props: { kind: 'empty' | 'error' | 'loading'; text: string }): React.ReactElement {
  return React.createElement('div', { className: 'dshsk-notice dshsk-notice-' + props.kind }, props.text)
}

/** 单个 skill 行：名称 + 来源 + 徽章 + 描述 + 删除，点击展开 whenToUse。 */
function SkillRow(props: {
  skill: SkillEntry
  expanded: boolean
  onToggle: () => void
  onRemove: () => void
  removing: boolean
}): React.ReactElement {
  const { skill, expanded } = props
  const src = sourceMeta(skill.source)
  const removable = skill.removable === null

  const rows: React.ReactNode[] = [
    React.createElement(
      'div',
      {
        className: 'dshsk-rowHead',
        onClick: props.onToggle,
        role: 'button',
        tabIndex: 0,
        'aria-expanded': expanded,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            props.onToggle()
          }
        },
      },
      React.createElement('span', { className: 'dshsk-name' }, skill.name),
      React.createElement('span', { className: 'dshsk-badge dshsk-src ' + src.cls, title: '来源: ' + skill.source }, src.label),
      React.createElement(InvocationBadge, { modelInvocable: skill.modelInvocable }),
      React.createElement('span', { className: 'dshsk-chevron' + (expanded ? ' dshsk-chevronOpen' : ''), 'aria-hidden': true }, '▸'),
    ),
    React.createElement('div', { className: 'dshsk-desc' }, skill.description || '（无描述）'),
  ]
  if (expanded && skill.whenToUse) {
    rows.push(
      React.createElement('div', { className: 'dshsk-when' },
        React.createElement('span', { className: 'dshsk-whenLabel' }, '适用场景'),
        React.createElement('span', { className: 'dshsk-whenText' }, skill.whenToUse),
      ),
    )
  }
  rows.push(
    React.createElement(
      'div',
      { className: 'dshsk-rowActions', onClick: (e: React.MouseEvent) => e.stopPropagation() },
      removable
        ? React.createElement(
            'button',
            {
              className: 'dshsk-remove',
              disabled: props.removing,
              onClick: props.onRemove,
            },
            props.removing ? '删除中…' : '删除',
          )
        : React.createElement('span', { className: 'dshsk-removeHint', title: skill.removable ?? '' }, '不可删除'),
    ),
  )
  return React.createElement('div', { className: 'dshsk-row' + (expanded ? ' dshsk-rowOpen' : '') }, rows)
}

/** 新建 skill 的内联表单。 */
function CreateForm(props: { onCreate: (fields: { name: string; description: string; whenToUse?: string }) => Promise<string | null> }): React.ReactElement {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [whenToUse, setWhenToUse] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  const submit = () => {
    setBusy(true)
    setErr(null)
    props.onCreate({ name, description, whenToUse: whenToUse.trim() || undefined })
      .then((e) => {
        if (e) setErr(e)
        else {
          setName('')
          setDescription('')
          setWhenToUse('')
        }
      })
      .finally(() => setBusy(false))
  }

  return React.createElement('div', { className: 'dshsk-form' },
    React.createElement('input', {
      className: 'dshsk-input',
      placeholder: '名称（kebab-case，如 my-skill）',
      value: name,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    }),
    React.createElement('input', {
      className: 'dshsk-input',
      placeholder: '描述（一句话）',
      value: description,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value),
    }),
    React.createElement('input', {
      className: 'dshsk-input',
      placeholder: '适用场景（可选）',
      value: whenToUse,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setWhenToUse(e.target.value),
    }),
    err ? React.createElement(Notice, { kind: 'error', text: err }) : null,
    React.createElement(
      'button',
      {
        className: 'dshsk-createBtn',
        disabled: busy || !name.trim() || !description.trim(),
        onClick: submit,
      },
      busy ? '创建中…' : '创建 skill',
    ),
  )
}

/** 技能管理页主体（纯全局）。 */
export function SkillManagerSection(props: SkillManagerSectionProps): React.ReactElement {
  const { rpc } = props

  if (!rpc) {
    return React.createElement(Notice, { kind: 'loading', text: '正在初始化…' })
  }

  const [skills, setSkills] = React.useState<SkillEntry[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [showForm, setShowForm] = React.useState(false)
  const [removing, setRemoving] = React.useState<Set<string>>(new Set())

  const list = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await rpc.call('/api', 'skill-manager/list', {})
      if (!res.ok) throw new Error('skill.list failed: ' + res.error.code + ': ' + res.error.message)
      const value = res.value as { skills: SkillEntry[] }
      setSkills([...value.skills])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [rpc])

  React.useEffect(() => {
    void list()
  }, [list])

  const createSkill = async (fields: { name: string; description: string; whenToUse?: string }): Promise<string | null> => {
    try {
      const res = await rpc.call('/api', 'skill-manager/create', fields)
      if (!res.ok) return res.error.message
      await list()
      return null
    } catch (e) {
      return e instanceof Error ? e.message : String(e)
    }
  }

  const removeSkill = async (name: string): Promise<void> => {
    if (!window.confirm('删除 skill「' + name + '」？此操作会从磁盘删除该 skill 文件。')) return
    setRemoving((prev) => new Set(prev).add(name))
    try {
      const res = await rpc.call('/api', 'skill-manager/remove', { name })
      if (!res.ok) {
        window.alert('删除失败：' + res.error.message)
      } else {
        await list()
      }
    } catch (e) {
      window.alert('删除失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev)
        next.delete(name)
        return next
      })
    }
  }

  const q = query.trim().toLowerCase()
  const visible = (skills ?? []).filter(
    (s) =>
      q === '' ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.whenToUse ?? '').toLowerCase().includes(q),
  )

  const [expandedSet, setExpandedSet] = React.useState<Set<string>>(() => new Set())
  const toggleExpand = React.useCallback((name: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const header = React.createElement('div', { className: 'dshsk-header' },
    React.createElement('h2', { className: 'dshsk-title' }, '技能管理'),
    React.createElement('span', { className: 'dshsk-count' },
      skills === null ? '' : `${visible.length} / ${skills.length} 个 skill`,
    ),
  )

  const toolbar = React.createElement('div', { className: 'dshsk-toolbar' },
    React.createElement('input', {
      className: 'dshsk-search',
      type: 'text',
      placeholder: '搜索名称 / 描述 / 适用场景…',
      value: query,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
    }),
    React.createElement(
      'button',
      { className: 'dshsk-newBtn', onClick: () => setShowForm((v) => !v) },
      showForm ? '取消' : '+ 新建 skill',
    ),
  )

  let content: React.ReactNode
  if (error && skills === null) {
    content = React.createElement(
      'div',
      { className: 'dshsk-errorBox' },
      React.createElement(Notice, { kind: 'error', text: '加载失败：' + error }),
      React.createElement('button', { className: 'dshsk-retry', onClick: () => void list() }, '重试'),
    )
  } else if (loading && skills === null) {
    content = React.createElement(Notice, { kind: 'loading', text: '正在加载 skill 目录…' })
  } else if ((skills ?? []).length === 0) {
    content = React.createElement(Notice, { kind: 'empty', text: '暂无可用的 skill' })
  } else if (visible.length === 0) {
    content = React.createElement(Notice, { kind: 'empty', text: '没有匹配「' + query + '」的 skill' })
  } else {
    content = React.createElement(
      'div',
      { className: 'dshsk-list' },
      visible.map((s) =>
        React.createElement(SkillRow, {
          key: s.name,
          skill: s,
          expanded: expandedSet.has(s.name),
          onToggle: () => toggleExpand(s.name),
          onRemove: () => void removeSkill(s.name),
          removing: removing.has(s.name),
        }),
      ),
    )
  }

  return React.createElement('div', { className: 'dshsk-root' },
    header,
    toolbar,
    showForm ? React.createElement(CreateForm, { onCreate: createSkill }) : null,
    content,
  )
}
