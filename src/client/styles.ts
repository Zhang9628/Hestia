/**
 * 汇总各功能模块的 CSS，按原始顺序（外观 → 番茄钟）拼成单个字符串，
 * 由入口在单个 <style> 标签里统一注入（保持「单一注入点 + 去重」行为）。
 */
import { APPEARANCE_CSS } from './appearance/styles'
import { POMODORO_CSS } from './pomodoro/styles'
import { PIN_CSS } from './pin/styles'
import { COLOR_CSS } from './color/styles'
import { USAGE_CSS } from './usage/styles'
import { NAV_CSS } from './nav/styles'

export const CSS = APPEARANCE_CSS + POMODORO_CSS + PIN_CSS + COLOR_CSS + USAGE_CSS + NAV_CSS
