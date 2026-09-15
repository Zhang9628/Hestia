/**
 * 番茄时钟（右下角悬浮球）：常驻倒计时，专注 / 短休 / 长休自动循环；
 * 时长可调、位置可拖动、可选环境音（雨 / 海 / 水 / 火），localStorage 记忆。
 */
import * as React from 'react'
import { playChime, startAmbient, stopAmbient, type PomSound } from './audio'
import { ActionIcon, LockIcon, ProgressRing, SolidLockIcon, SolidUnlockIcon, SoundIcon, Stepper, UnlockIcon } from './widgets'
import { BallMotif, getStyle, loadStyleId, POM_STYLE_KEY, StyleSwitcher } from './style'

type PomPhase = 'work' | 'short' | 'long'

const POM_DUR_KEY = 'hestia-pomodoro-durations'
const POM_SOUND_KEY = 'hestia-pomodoro-sound'
const POM_POS_KEY = 'hestia-pomodoro-pos'
const POM_LOCK_KEY = 'hestia-pomodoro-locked'

const POM_SOUNDS: { id: PomSound; label: string }[] = [
  { id: 'none', label: '无' },
  { id: 'rain', label: '雨' },
  { id: 'sea', label: '海' },
  { id: 'water', label: '水' },
  { id: 'fire', label: '火' },
]

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m + ':' + (s < 10 ? '0' : '') + s
}

function phaseLabel(p: PomPhase): string {
  return p === 'work' ? '专注' : p === 'short' ? '短休' : '长休'
}

function loadDurations(): { work: number; short: number; long: number } {
  try {
    const raw = localStorage.getItem(POM_DUR_KEY)
    if (raw !== null) {
      const p = JSON.parse(raw)
      if (typeof p.work === 'number' && typeof p.short === 'number' && typeof p.long === 'number' &&
        p.work >= 1 && p.work <= 120 && p.short >= 1 && p.short <= 60 && p.long >= 1 && p.long <= 120) {
        return { work: Math.round(p.work), short: Math.round(p.short), long: Math.round(p.long) }
      }
    }
  } catch {
    // ignore
  }
  return { work: 25, short: 5, long: 15 }
}

function loadSound(): PomSound {
  try {
    const raw = localStorage.getItem(POM_SOUND_KEY)
    if (raw === 'rain' || raw === 'sea' || raw === 'water' || raw === 'fire' || raw === 'none') return raw
  } catch {
    // ignore
  }
  return 'none'
}

function loadLocked(): boolean {
  try {
    return localStorage.getItem(POM_LOCK_KEY) !== '0'
  } catch {
    // ignore
  }
  return true
}

function loadPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(POM_POS_KEY)
    if (raw !== null) {
      const p = JSON.parse(raw)
      if (typeof p.x === 'number' && typeof p.y === 'number') return { x: p.x, y: p.y }
    }
  } catch {
    // ignore
  }
  return null
}

/** 右下角悬浮番茄球：常驻倒计时，点开控制面板；可解锁拖动。 */
export function PomodoroBall(): React.ReactElement {
  const [phase, setPhase] = React.useState<PomPhase>('work')
  const [running, setRunning] = React.useState(false)
  const [remaining, setRemaining] = React.useState<number>(loadDurations().work * 60)
  const [pomodoros, setPomodoros] = React.useState(0)
  const [open, setOpen] = React.useState(false)
  const [durMin, setDurMin] = React.useState(loadDurations)
  const [sound, setSound] = React.useState<PomSound>(loadSound)
  const [locked, setLocked] = React.useState<boolean>(loadLocked)
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(loadPos)
  const [styleId, setStyleId] = React.useState<string>(loadStyleId)
  const [editing, setEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState('')
  const editCancelRef = React.useRef(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const movedRef = React.useRef(false)
  const durSec: Record<PomPhase, number> = { work: durMin.work * 60, short: durMin.short * 60, long: durMin.long * 60 }

  // 倒计时（每秒递减，到 0 停在该刻）
  React.useEffect(() => {
    if (!running) return
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [running])

  // 阶段切换：专注结束 → 休息；休息结束 → 专注（每 4 个专注进长休）
  React.useEffect(() => {
    if (!running || remaining !== 0) return
    if (phase === 'work') {
      const done = pomodoros + 1
      setPomodoros(done)
      const next: PomPhase = done % 4 === 0 ? 'long' : 'short'
      setPhase(next)
      setRemaining(durSec[next])
    } else {
      setPhase('work')
      setRemaining(durSec.work)
    }
    playChime()
  }, [remaining, running, phase, pomodoros, durSec])

  // 点击外部 / Esc 关闭面板
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // 刷新后恢复环境音：首次用户交互时重建 AudioContext（autoplay 策略）
  React.useEffect(() => {
    if (sound === 'none') return
    const resume = () => startAmbient(sound)
    document.addEventListener('pointerdown', resume, { once: true })
    return () => document.removeEventListener('pointerdown', resume)
  }, [sound])

  // 窗口尺寸变化时，把已拖动的位置重新夹回可视区（自适应边界；挂载时也夹一次，防上次大窗口留下的越界坐标）
  React.useEffect(() => {
    const clamp = () => {
      const el = rootRef.current
      const w = el !== null ? el.getBoundingClientRect().width : 56
      const h = el !== null ? el.getBoundingClientRect().height : 56
      setPos((p) => {
        if (p === null) return p
        const x = Math.max(0, Math.min(p.x, window.innerWidth - w))
        const y = Math.max(0, Math.min(p.y, window.innerHeight - h))
        if (x === p.x && y === p.y) return p
        return { x, y }
      })
    }
    clamp()
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [])

  const startPause = () => setRunning((v) => !v)
  const skip = () => {
    if (phase === 'work') {
      const done = pomodoros + 1
      setPomodoros(done)
      const next: PomPhase = done % 4 === 0 ? 'long' : 'short'
      setPhase(next)
      setRemaining(durSec[next])
    } else {
      setPhase('work')
      setRemaining(durSec.work)
    }
    setRunning(false)
    playChime()
  }
  const reset = () => {
    setPhase('work')
    setRemaining(durSec.work)
    setPomodoros(0)
    setRunning(false)
  }

  const setDuration = (p: PomPhase, minutes: number) => {
    const next = { ...durMin, [p]: minutes }
    setDurMin(next)
    try {
      localStorage.setItem(POM_DUR_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
    if (phase === p && !running) setRemaining(minutes * 60)
  }

  const selectSound = (type: PomSound) => {
    setSound(type)
    try {
      localStorage.setItem(POM_SOUND_KEY, type)
    } catch {
      // ignore
    }
    if (type === 'none') stopAmbient()
    else startAmbient(type)
  }

  const toggleLock = () => {
    setLocked((v) => {
      const next = !v
      try {
        localStorage.setItem(POM_LOCK_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }

  const changeStyle = (id: string) => {
    setStyleId(id)
    try {
      localStorage.setItem(POM_STYLE_KEY, id)
    } catch {
      // ignore
    }
  }

  // 点击大计时数字 → 内联编辑（分钟，正整数）；Enter/点别处生效，Esc 取消。
  const startEditing = () => {
    editCancelRef.current = false
    setEditValue(String(durMin[phase]))
    setEditing(true)
  }

  const commitEdit = () => {
    setEditing(false)
    if (editCancelRef.current) {
      editCancelRef.current = false
      return
    }
    const raw = editValue.trim()
    if (!/^\d+$/.test(raw)) return // 只允许正整数
    const n = parseInt(raw, 10)
    const max = phase === 'short' ? 60 : 120
    if (n < 1 || n > max) return
    const next = { ...durMin, [phase]: n }
    setDurMin(next)
    try {
      localStorage.setItem(POM_DUR_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
    setRemaining(n * 60)
  }

  const onEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur() // → onBlur → commitEdit
    } else if (e.key === 'Escape') {
      editCancelRef.current = true
      e.currentTarget.blur() // → onBlur → 跳过提交
    }
  }

  const applyPos = (x: number, y: number) => {
    const p = { x: Math.round(x), y: Math.round(y) }
    setPos(p)
    try {
      localStorage.setItem(POM_POS_KEY, JSON.stringify(p))
    } catch {
      // ignore
    }
  }

  // 拖动小球（解锁后才可拖）
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (locked) return
    movedRef.current = false
    const el = rootRef.current
    if (el === null) return
    const rect = el.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (!movedRef.current && Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true
      if (movedRef.current) {
        const x = Math.max(0, Math.min(ev.clientX - offsetX, window.innerWidth - rect.width))
        const y = Math.max(0, Math.min(ev.clientY - offsetY, window.innerHeight - rect.height))
        applyPos(x, y)
      }
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onBallClick = () => {
    if (movedRef.current) {
      movedRef.current = false
      return
    }
    setOpen((v) => !v)
  }

  const pomStyle = getStyle(styleId)
  const bold = pomStyle.lockIcon === 'solid'
  const total = durSec[phase]
  const ratio = remaining / total
  const arcColor = phase === 'work' ? 'var(--dshp-ball-accent)' : 'var(--dshp-ball-accent-rest)'

  const ball = React.createElement(
    'button',
    {
      type: 'button',
      className: 'dshp-ball' + (locked ? '' : ' dshp-drag'),
      'aria-label': '番茄钟',
      title: locked ? '番茄钟：专注 / 休息计时' : '番茄钟（可拖动）',
      onPointerDown: onPointerDown,
      onClick: onBallClick,
    },
    React.createElement(ProgressRing, { ratio, size: 56, stroke: 5, color: arcColor, track: 'var(--dshp-ball-track)' }),
    React.createElement('span', { className: 'dshp-ballTime' }, fmt(remaining)),
    React.createElement(BallMotif, { motif: pomStyle.ballMotif, sealChar: pomStyle.sealChar }),
  )

  const dots = [0, 1, 2, 3].map((i) =>
    React.createElement('span', { key: i, className: 'dshp-dot' + (i < pomodoros % 4 ? ' dshp-dotFill' : '') }),
  )

  const lockGlyph = pomStyle.lockIcon === 'solid'
    ? (locked ? React.createElement(SolidLockIcon) : React.createElement(SolidUnlockIcon))
    : (locked ? React.createElement(LockIcon) : React.createElement(UnlockIcon))

  const lockBtn = React.createElement(
    'button',
    { type: 'button', className: 'dshp-lock' + (locked ? '' : ' dshp-lockUnlocked'), 'aria-pressed': !locked, title: locked ? '解锁后可拖动' : '锁定位置', onClick: toggleLock },
    lockGlyph,
  )

  const soundChips = POM_SOUNDS.map((s) =>
    React.createElement('button', {
      type: 'button', key: s.id,
      className: 'dshp-sound' + (sound === s.id ? ' dshp-soundOn' : ''),
      title: s.label,
      onClick: () => selectSound(s.id),
    },
      React.createElement(SoundIcon, { kind: s.id, bold }),
      React.createElement('span', { className: 'dshp-soundLabel' }, s.label),
    ),
  )

  const timeEl = editing
    ? React.createElement('input', {
        className: 'dshp-timeInput',
        type: 'text',
        inputMode: 'numeric',
        autoFocus: true,
        value: editValue,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value),
        onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
        onBlur: commitEdit,
        onKeyDown: onEditKeyDown,
      })
    : React.createElement('button', {
        type: 'button',
        className: 'dshp-time',
        title: '点击修改时长（分钟）',
        onClick: startEditing,
      }, fmt(remaining))

  const panel = React.createElement(
    'div',
    { className: 'dshp-panel' + (open ? ' dshp-panelOpen' : ''), 'aria-hidden': !open },
    React.createElement('div', { className: 'dshp-head' },
      React.createElement('span', { className: 'dshp-phase' }, phaseLabel(phase) + ' · 第 ' + (pomodoros + 1) + ' 个番茄'),
      React.createElement('div', { className: 'dshp-headRight' },
        React.createElement(StyleSwitcher, { styleId, onChange: changeStyle }),
        lockBtn,
      ),
    ),
    timeEl,
    React.createElement('div', { className: 'dshp-dots' }, dots),
    React.createElement('div', { className: 'dshp-actions' },
      React.createElement('button', { type: 'button', className: 'dshp-btn dshp-btnPrimary', onClick: startPause },
        React.createElement(ActionIcon, { kind: running ? 'pause' : 'play', bold }),
        running ? '暂停' : '开始',
      ),
      React.createElement('button', { type: 'button', className: 'dshp-btn', onClick: skip },
        React.createElement(ActionIcon, { kind: 'skip', bold }),
        '跳过',
      ),
      React.createElement('button', { type: 'button', className: 'dshp-btn', onClick: reset },
        React.createElement(ActionIcon, { kind: 'reset', bold }),
        '重置',
      ),
    ),
    React.createElement('div', { className: 'dshp-divider' }),
    React.createElement('div', { className: 'dshp-settings' },
      React.createElement('div', { className: 'dshp-row dshp-rowSteps' },
        React.createElement(Stepper, { label: '专注', value: durMin.work, min: 1, max: 120, onChange: (n) => setDuration('work', n) }),
        React.createElement(Stepper, { label: '短休', value: durMin.short, min: 1, max: 60, onChange: (n) => setDuration('short', n) }),
        React.createElement(Stepper, { label: '长休', value: durMin.long, min: 1, max: 120, onChange: (n) => setDuration('long', n) }),
      ),
      React.createElement('div', { className: 'dshp-row' },
        React.createElement('span', { className: 'dshp-rowLabel' }, '环境音'),
        React.createElement('div', { className: 'dshp-sounds' }, soundChips),
      ),
    ),
    locked ? null : React.createElement('span', { className: 'dshp-hint' }, '拖动右下角小球可移动位置'),
  )

  const style = pos !== null ? { left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' } : undefined
  return React.createElement('div', { className: 'dshp-root', ref: rootRef, style, 'data-style': styleId }, [ball, panel])
}
