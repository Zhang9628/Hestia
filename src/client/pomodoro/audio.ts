/**
 * 环境音与提示音（Web Audio 合成，无需音频文件）。
 * - 环境音：雨（粉噪声 + 雨滴 tap + 雷）/ 海（棕噪声 + 双 LFO）/ 水（带通 + LFO）/ 火（棕噪声底 + 白噪声 crackle）
 * - 结束提示音：两声上行正弦「叮咚」
 */
export type PomSound = 'none' | 'rain' | 'sea' | 'water' | 'fire'

let audioCtx: AudioContext | null = null
let ambientStop: (() => void) | null = null

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx === null || audioCtx.state === 'closed') {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AC === undefined) return null
    try {
      audioCtx = new AC()
    } catch {
      return null
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function makeNoise(ctx: AudioContext, kind: 'white' | 'pink' | 'brown', seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const d = buf.getChannelData(0)
  if (kind === 'white') {
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  } else if (kind === 'brown') {
    let last = 0
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.0
    }
  } else {
    // 粉红噪声（Paul Kellet 1/f）
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  }
  return buf
}

function noiseSource(ctx: AudioContext, kind: 'white' | 'pink' | 'brown'): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = makeNoise(ctx, kind, 8)
  src.loop = true
  return src
}

function makeOsc(ctx: AudioContext, freq: number): OscillatorNode {
  const o = ctx.createOscillator()
  o.frequency.value = freq
  return o
}

function makeGain(ctx: AudioContext, v: number): GainNode {
  const g = ctx.createGain()
  g.gain.value = v
  return g
}

function makeFilter(ctx: AudioContext, type: BiquadFilterType, freq: number, q?: number): BiquadFilterNode {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  if (q !== undefined) f.Q.value = q
  return f
}

let tapBuf: AudioBuffer | null = null
function getTapBuffer(ctx: AudioContext): AudioBuffer {
  if (tapBuf === null) tapBuf = makeNoise(ctx, 'white', 0.06)
  return tapBuf
}

/** 雨滴落地：短噪声 tap，随机带通频率，快速衰减，模拟「滴答/啪嗒」。 */
function dropletTap(ctx: AudioContext, dest: AudioNode): void {
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = getTapBuffer(ctx)
  const bp = makeFilter(ctx, 'bandpass', 700 + Math.random() * 1800, 4)
  const g = ctx.createGain()
  const amp = 0.06 + Math.random() * 0.12
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(amp, t + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.06)
  src.connect(bp).connect(g).connect(dest)
  src.start(t)
  src.stop(t + 0.16)
}

let thunderBuf: AudioBuffer | null = null
function getThunderBuffer(ctx: AudioContext): AudioBuffer {
  if (thunderBuf === null) thunderBuf = makeNoise(ctx, 'brown', 6)
  return thunderBuf
}

/** 雷声：低频棕噪声轰鸣，快速起、长衰减（2~4.5s）。 */
function thunder(ctx: AudioContext, dest: AudioNode): void {
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = getThunderBuffer(ctx)
  const lp = makeFilter(ctx, 'lowpass', 100 + Math.random() * 90)
  const g = ctx.createGain()
  const dur = 2 + Math.random() * 2.5
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.5 + Math.random() * 0.35, t + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(lp).connect(g).connect(dest)
  src.start(t)
  src.stop(t + dur + 0.1)
}

export function startAmbient(type: PomSound): void {
  stopAmbient()
  if (type === 'none') return
  const ctx = ensureCtx()
  if (ctx === null) return
  const stoppables: Array<{ stop: () => void }> = []
  const dest = ctx.destination

  if (type === 'rain') {
    // 1) 底噪雨幕：粉红噪声 → 低通 5kHz，音量压低
    const hiss = noiseSource(ctx, 'pink')
    hiss.connect(makeFilter(ctx, 'lowpass', 5000)).connect(makeGain(ctx, 0.16)).connect(dest)
    hiss.start()
    stoppables.push(hiss)

    // 2) 雨滴落地：短噪声 tap，随机带通频率，密集随机触发
    const dropTimer = setInterval(() => {
      if (Math.random() < 0.85) dropletTap(ctx, dest)
      if (Math.random() < 0.3) dropletTap(ctx, dest)
    }, 60)
    stoppables.push({ stop: () => clearInterval(dropTimer) })

    // 3) 雷声：随机间隔（15~40s）低频轰鸣
    let thunderTimer = 0
    const scheduleThunder = () => {
      thunderTimer = window.setTimeout(() => {
        thunder(ctx, dest)
        scheduleThunder()
      }, 15000 + Math.random() * 25000)
    }
    scheduleThunder()
    stoppables.push({ stop: () => clearTimeout(thunderTimer) })
  } else if (type === 'sea') {
    // 棕噪声 → 低通 700Hz，双 LFO（快浪 0.08Hz + 慢潮 0.03Hz）调制音量
    const src = noiseSource(ctx, 'brown')
    const g = makeGain(ctx, 0.34)
    const lfo1 = makeOsc(ctx, 0.08)
    const lfo2 = makeOsc(ctx, 0.03)
    lfo1.connect(makeGain(ctx, 0.13)).connect(g.gain)
    lfo2.connect(makeGain(ctx, 0.08)).connect(g.gain)
    lfo1.start()
    lfo2.start()
    src.connect(makeFilter(ctx, 'lowpass', 700)).connect(g).connect(dest)
    src.start()
    stoppables.push(src, lfo1, lfo2)
  } else if (type === 'water') {
    // 棕噪声 → 带通 500Hz，LFO 调制中心频率（咕噜流水感）
    const src = noiseSource(ctx, 'brown')
    const bp = makeFilter(ctx, 'bandpass', 500, 0.8)
    const lfo = makeOsc(ctx, 0.5)
    lfo.connect(makeGain(ctx, 150)).connect(bp.frequency)
    lfo.start()
    src.connect(bp).connect(makeGain(ctx, 0.42)).connect(dest)
    src.start()
    stoppables.push(src, lfo)
  } else {
    // fire：棕噪声低通（底噪）+ 白噪声高通（随机 crackle 脉冲）
    const base = noiseSource(ctx, 'brown')
    base.connect(makeFilter(ctx, 'lowpass', 500)).connect(makeGain(ctx, 0.24)).connect(dest)
    base.start()
    const ck = noiseSource(ctx, 'white')
    const ckG = makeGain(ctx, 0.0001)
    ck.connect(makeFilter(ctx, 'highpass', 1800)).connect(ckG).connect(dest)
    ck.start()
    const timer = setInterval(() => {
      if (Math.random() < 0.4) {
        const t = ctx.currentTime
        ckG.gain.cancelScheduledValues(t)
        ckG.gain.setValueAtTime(0.0001, t)
        ckG.gain.exponentialRampToValueAtTime(Math.random() * 0.28 + 0.08, t + 0.006)
        ckG.gain.exponentialRampToValueAtTime(0.0001, t + 0.04 + Math.random() * 0.06)
      }
    }, 70)
    stoppables.push(base, ck, { stop: () => clearInterval(timer) })
  }

  ambientStop = () => {
    for (const n of stoppables) {
      try {
        n.stop()
      } catch {
        // ignore
      }
    }
  }
}

export function stopAmbient(): void {
  if (ambientStop !== null) {
    ambientStop()
    ambientStop = null
  }
}

/** 结束提示音：两声上行正弦「叮咚」。 */
export function playChime(): void {
  const ctx = ensureCtx()
  if (ctx === null) return
  const now = ctx.currentTime
  ;[660, 880].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = now + i * 0.18
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    osc.connect(g).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.55)
  })
}
