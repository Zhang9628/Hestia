/**
 * dsh-skill-manager 样式（dshsk-* 前缀）。
 * 设置页「技能管理」：页头 / 工具栏（会话下拉 + 搜索）/ skill 卡片行 / 徽章 / 空态。
 */
export const CSS = `
.dshsk-root {
  --dshsk-accent: #6366f1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.dshsk-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.dshsk-title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--dsw-fg, inherit);
}

.dshsk-count {
  font-size: 12px;
  color: var(--dsw-fg-muted, #8a8f98);
  white-space: nowrap;
}

.dshsk-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.dshsk-sel {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.dshsk-selLabel {
  color: var(--dsw-fg-muted, #8a8f98);
  white-space: nowrap;
}

.dshsk-select {
  max-width: 260px;
  padding: 5px 8px;
  font-size: 13px;
  border: 1px solid var(--dsw-border, rgba(127,127,127,0.35));
  border-radius: 8px;
  background: var(--dsw-bg-2, rgba(127,127,127,0.08));
  color: var(--dsw-fg, inherit);
  outline: none;
  cursor: pointer;
}

.dshsk-select:focus-visible {
  border-color: var(--dshsk-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dshsk-accent) 25%, transparent);
}

.dshsk-search {
  flex: 1 1 200px;
  min-width: 140px;
  padding: 5px 10px;
  font-size: 13px;
  border: 1px solid var(--dsw-border, rgba(127,127,127,0.35));
  border-radius: 8px;
  background: var(--dsw-bg-2, rgba(127,127,127,0.08));
  color: var(--dsw-fg, inherit);
  outline: none;
}

.dshsk-search:focus-visible {
  border-color: var(--dshsk-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dshsk-accent) 25%, transparent);
}

.dshsk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dshsk-row {
  border: 1px solid var(--dsw-border, rgba(127,127,127,0.25));
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--dsw-bg-2, rgba(127,127,127,0.05));
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.dshsk-row:hover {
  border-color: var(--dsw-border-strong, rgba(127,127,127,0.5));
}

.dshsk-rowOpen {
  border-color: color-mix(in srgb, var(--dshsk-accent) 45%, transparent);
}

.dshsk-rowHead {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.dshsk-name {
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-fg, inherit);
}

.dshsk-badge {
  flex: none;
  font-size: 11px;
  line-height: 1;
  padding: 3px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.dshsk-badgeModel {
  color: #fff;
  background: #3b82f6;
}

.dshsk-badgeUser {
  color: #f59e0b;
  background: color-mix(in srgb, #f59e0b 14%, transparent);
  border: 1px solid color-mix(in srgb, #f59e0b 45%, transparent);
}

.dshsk-chevron {
  margin-left: auto;
  font-size: 10px;
  color: var(--dsw-fg-muted, #8a8f98);
  transition: transform 0.15s ease;
}

.dshsk-chevronOpen {
  transform: rotate(90deg);
}

.dshsk-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--dsw-fg-muted, #6b7280);
}

.dshsk-when {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--dsw-border, rgba(127,127,127,0.25));
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dshsk-whenLabel {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--dsw-fg-muted, #8a8f98);
}

.dshsk-whenText {
  font-size: 13px;
  line-height: 1.6;
  color: var(--dsw-fg, inherit);
}

.dshsk-projects {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.dshsk-project {
  font-size: 11px;
  line-height: 1;
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--dsw-fg-muted, #8a8f98);
  background: var(--dsw-bg-3, rgba(127,127,127,0.12));
  border: 1px solid var(--dsw-border, rgba(127,127,127,0.25));
  white-space: nowrap;
}

.dshsk-projectMore {
  color: var(--dsw-fg-muted, #8a8f98);
  font-weight: 600;
}

.dshsk-notice {
  padding: 20px 16px;
  border-radius: 12px;
  font-size: 13px;
  text-align: center;
  color: var(--dsw-fg-muted, #8a8f98);
  background: var(--dsw-bg-2, rgba(127,127,127,0.05));
  border: 1px dashed var(--dsw-border, rgba(127,127,127,0.3));
}

.dshsk-errorBox {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dshsk-errorBox .dshsk-notice {
  flex: 1;
  border-style: solid;
  border-color: color-mix(in srgb, #ef4444 40%, transparent);
  color: #ef4444;
  text-align: left;
}

.dshsk-retry {
  flex: none;
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid var(--dsw-border, rgba(127,127,127,0.35));
  border-radius: 8px;
  background: var(--dsw-bg-2, rgba(127,127,127,0.08));
  color: var(--dsw-fg, inherit);
  cursor: pointer;
}

.dshsk-retry:hover {
  border-color: var(--dshsk-accent);
}

.dshsk-retry:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--dshsk-accent) 50%, transparent);
  outline-offset: 1px;
}

.dshsk-src {
  --dshsk-src-fg: #8a8f98;
  color: var(--dshsk-src-fg);
  background: color-mix(in srgb, var(--dshsk-src-fg) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--dshsk-src-fg) 35%, transparent);
}

.dshsk-srcUser {
  --dshsk-src-fg: #10b981;
}

.dshsk-srcBundled {
  --dshsk-src-fg: #8b5cf6;
}

.dshsk-srcProject {
  --dshsk-src-fg: #0ea5e9;
}

.dshsk-srcCustom {
  --dshsk-src-fg: #f59e0b;
}

.dshsk-newBtn {
  flex: none;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid color-mix(in srgb, var(--dshsk-accent) 55%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--dshsk-accent) 14%, transparent);
  color: var(--dshsk-accent);
  cursor: pointer;
}

.dshsk-newBtn:hover {
  background: color-mix(in srgb, var(--dshsk-accent) 22%, transparent);
}

.dshsk-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--dshsk-accent) 35%, transparent);
  border-radius: 12px;
  background: var(--dsw-bg-2, rgba(127,127,127,0.05));
}

.dshsk-input {
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid var(--dsw-border, rgba(127,127,127,0.35));
  border-radius: 8px;
  background: var(--dsw-bg-2, rgba(127,127,127,0.08));
  color: var(--dsw-fg, inherit);
  outline: none;
}

.dshsk-input:focus-visible {
  border-color: var(--dshsk-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dshsk-accent) 25%, transparent);
}

.dshsk-createBtn {
  align-self: flex-start;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: var(--dshsk-accent);
  color: #fff;
  cursor: pointer;
}

.dshsk-createBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dshsk-rowActions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.dshsk-remove {
  padding: 3px 10px;
  font-size: 12px;
  border: 1px solid color-mix(in srgb, #ef4444 45%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, #ef4444 10%, transparent);
  color: #ef4444;
  cursor: pointer;
}

.dshsk-remove:hover:not(:disabled) {
  background: color-mix(in srgb, #ef4444 18%, transparent);
}

.dshsk-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dshsk-removeHint {
  font-size: 12px;
  color: var(--dsw-fg-muted, #8a8f98);
}
`