/**
 * 背景壁纸：上传图片（FileReader + canvas 降采样 → JPEG dataURL），localStorage 记忆。
 * 通过 style 标签给「消息区」（`[data-conversation-scroll]`，即 header/对话·轨迹 标签页之下、
 * 底部粘着输入框之上的滚动容器）叠加背景图 + 半透明遮罩（透明度调节）。
 * 目标是滚动容器本身：背景默认 `background-attachment: scroll`，随元素盒固定、不随消息滚动；
 * `background-size: cover` 让图片自适应消息区大小并居中；底部输入框（sticky + 渐隐遮罩）自然盖住图片。
 * 透明度靠「底色遮罩」实现：遮罩 alpha = 1 - opacity，叠在图上等同于图片以 opacity 显示，
 * 不碰 z-index / 层叠上下文。
 */
import * as React from 'react'

const BG_IMAGE_KEY = 'hestia-bg-image'
const BG_OPACITY_KEY = 'hestia-bg-opacity'
const OPACITY_MIN = 0.05
const OPACITY_MAX = 1
const OPACITY_STEP = 0.05
const OPACITY_DEFAULT = 0.4
const MAX_DIM = 1920 // 降采样最大边长，控制 localStorage 占用（约 5MB 配额）
const JPEG_QUALITY = 0.85

function loadBgImage(): string {
  try {
    const raw = localStorage.getItem(BG_IMAGE_KEY)
    if (typeof raw === 'string' && raw.startsWith('data:image/')) return raw
  } catch {
    // ignore
  }
  return ''
}

function loadBgOpacity(): number {
  try {
    const raw = localStorage.getItem(BG_OPACITY_KEY)
    const n = Number(raw)
    if (Number.isFinite(n) && n >= OPACITY_MIN && n <= OPACITY_MAX) return n
  } catch {
    // ignore
  }
  return OPACITY_DEFAULT
}

/** 构造背景 CSS：无图返回空串；有图则叠加「图 + 底色遮罩」。 */
function buildBgCss(image: string, opacity: number): string {
  if (image === '') return ''
  const overlayAlpha = Math.round((1 - opacity) * 100)
  const overlay = `color-mix(in srgb, var(--dsw-alias-bg-base) ${overlayAlpha}%, transparent)`
  return [
    '[data-conversation-scroll] {',
    `  background-image: linear-gradient(${overlay}, ${overlay}), url("${image}") !important;`,
    '  background-size: cover, cover !important;',
    '  background-position: center, center !important;',
    '  background-repeat: no-repeat, no-repeat !important;',
    '}',
  ].join('')
}

/** 读取文件为 dataURL，并用 canvas 降采样 + 转 JPEG，避免 localStorage 配额溢出。 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Image decode failed'))
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const g = canvas.getContext('2d')
        if (g === null) {
          reject(new Error('Canvas 2D unavailable'))
          return
        }
        g.drawImage(img, 0, 0, w, h)
        try {
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
        } catch (err) {
          reject(err instanceof Error ? err : new Error('toDataURL failed'))
        }
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

/** lucide image：图片图标，单笔 2px 描边。 */
function ImageIcon(): React.ReactElement {
  return React.createElement(
    'svg',
    { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    React.createElement('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2, ry: 2 }),
    React.createElement('circle', { cx: 8.5, cy: 8.5, r: 1.5 }),
    React.createElement('path', { d: 'm21 15-5-5L5 21' }),
  )
}

/** lucide x：清除图标，单笔 2px 描边。 */
function XIcon(): React.ReactElement {
  return React.createElement(
    'svg',
    { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
    React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 }),
  )
}

/** 背景壁纸控件（外观弹层内）：上传 / 预览 / 清除 + 透明度滑块，localStorage 记忆。 */
export function BackgroundImageControl(): React.ReactElement {
  const [image, setImage] = React.useState<string>(loadBgImage)
  const [opacity, setOpacity] = React.useState<number>(loadBgOpacity)
  const styleRef = React.useRef<HTMLStyleElement | null>(null)
  const fileRef = React.useRef<HTMLInputElement | null>(null)
  const uploadRef = React.useRef<HTMLButtonElement | null>(null)
  const labelRef = React.useRef<HTMLSpanElement | null>(null)

  // 挂载时建一次 style 标签，卸载时才删——与弹层开关解耦。
  React.useEffect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-hestia'
    tag.dataset.pluginCss = 'dsh-hestia/bg-dynamic'
    document.head.appendChild(tag)
    styleRef.current = tag
    return () => {
      tag.remove()
      styleRef.current = null
    }
  }, [])

  // 图片 / 透明度变化时只更新内容 + localStorage。
  React.useEffect(() => {
    if (styleRef.current !== null) {
      styleRef.current.textContent = buildBgCss(image, opacity)
    }
    try {
      if (image === '') localStorage.removeItem(BG_IMAGE_KEY)
      else localStorage.setItem(BG_IMAGE_KEY, image)
      localStorage.setItem(BG_OPACITY_KEY, String(opacity))
    } catch {
      // localStorage 配额不足时忽略：图片已在内存生效，仅本次会话有效。
    }
  }, [image, opacity])

  // 对齐：本行滑块前比「宽度/字号」两行多一个「透明度」标签，导致滑块/数值左移十几像素。
  // 给「上传图片」按钮补 margin-right = seg宽度 - 上传按钮宽 - 标签宽 - 间距，让滑块与上方两行严格对齐。
  React.useEffect(() => {
    const seg = document.querySelector('.dshwc-seg')
    const upload = uploadRef.current
    const label = labelRef.current
    if (seg instanceof HTMLElement && upload !== null && label !== null) {
      const GAP = 10
      const extra = seg.getBoundingClientRect().width - upload.getBoundingClientRect().width - label.getBoundingClientRect().width - GAP
      upload.style.marginRight = Math.max(0, extra) + 'px'
    }
  }, [])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重复选择同一文件
    if (file === undefined || !file.type.startsWith('image/')) return
    fileToDataUrl(file)
      .then((url) => setImage(url))
      .catch(() => {
        // 忽略无效图片
      })
  }

  const clear = () => setImage('')

  const uploadBtn = React.createElement(
    'button',
    { type: 'button', ref: uploadRef, className: 'dshwc-bgUpload', title: '上传背景图片', onClick: () => fileRef.current?.click() },
    React.createElement(ImageIcon),
    React.createElement('span', null, image === '' ? '上传图片' : '更换图片'),
  )

  const preview =
    image === ''
      ? null
      : React.createElement(
          'div',
          { className: 'dshwc-bgPreview' },
          React.createElement('img', { src: image, alt: '背景预览' }),
        )

  const clearBtn =
    image === ''
      ? null
      : React.createElement(
          'button',
          { type: 'button', className: 'dshwc-bgClear', title: '清除背景图片', 'aria-label': '清除背景图片', onClick: clear },
          React.createElement(XIcon),
        )

  const slider = React.createElement('input', {
    type: 'range',
    min: OPACITY_MIN,
    max: OPACITY_MAX,
    step: OPACITY_STEP,
    value: opacity,
    className: 'dshwc-range',
    'aria-label': '背景透明度',
    disabled: image === '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setOpacity(Number(e.target.value)),
  })
  const track = React.createElement('div', { className: 'dshwc-track' })
  const sliderWrap = React.createElement('div', { className: 'dshwc-sliderWrap' + (image === '' ? ' dshwc-sliderWrapDisabled' : '') }, [slider, track])
  const value = React.createElement('span', { className: 'dshwc-value' }, Math.round(opacity * 100) + '%')

  const fileInput = React.createElement('input', {
    type: 'file',
    accept: 'image/*',
    ref: fileRef,
    style: { display: 'none' },
    'aria-hidden': true,
    tabIndex: -1,
    onChange: onFile,
  })

  return React.createElement(
    'div',
    { className: 'dshwc-bgRoot', title: '设置对话区背景图片与透明度' },
    [
      uploadBtn,
      React.createElement('span', { className: 'dshwc-bgLabel', ref: labelRef, key: 'label' }, '透明度'),
      sliderWrap,
      value,
      preview,
      clearBtn,
      fileInput,
    ],
  )
}
