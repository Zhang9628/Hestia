<div align="center">
  <img src="assets/hestia-logo.png" width="360" alt="Hestia logo" />
  <h1>Hestia · DeepSeek Harness Session Enhancement Plugin</h1>
  <p><strong>Make your AI conversation interface smoother and more comfortable.</strong><br>Conversation width · Fonts · Skins · Wallpapers · Pomodoro timer · Session navigation</p>
  <p><a href="README.zh.md">简体中文</a> · <strong>English</strong></p>
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-d97706" alt="MIT license" /></a>
    <img src="https://img.shields.io/badge/node-%5E22.18.0%20%7C%7C%20%3E%3D24.11.0-339933" alt="Node.js ^22.18.0 || >=24.11.0" />
  </p>
</div>

Hestia is a standalone [DSH](https://github.com/deepseek-ai/deepseek-harness) plugin you can install with a single `dsh plugin add` command. It adds an "Appearance" settings panel to the session page header, letting you adjust conversation width, fonts, skins, and wallpapers in one place — plus a Pomodoro timer (with 5 switchable style themes).

## ✨ Features

Click the "Appearance" button in the session page header to open the settings panel. Every option is remembered automatically.

### Conversation width

- Slider + presets (Narrow / Standard / Wide / Extra wide) to adjust the conversation column width, with magnetic snapping near presets for a smooth feel

### Fonts

- Font size: Small / Standard / Large / Extra large
- Font family: Default / System / Songti / Heiti / Microsoft YaHei / KaiTi / Monospace

### Background wallpaper

- Upload a local image as the conversation (message area) background; it is auto-downsampled to JPEG and remembered locally, persisting after restart
- An opacity slider (5%–100%) adjusts the wallpaper intensity; the image covers the message area, is centered, and stays fixed while messages scroll
- After uploading, the button becomes "Change image"; a thumbnail preview appears, and one-click "Clear" restores the plain background

### Skins

- **Pure white / Pure black**: one-click switch between light and dark interfaces

### Pomodoro timer

- A floating ball in the bottom-right corner shows a persistent countdown, automatically cycling through focus / short break / long break
- Adjustable durations, draggable position, and optional ambient sounds (rain / sea / water / fire); duration / sound / position / lock are all remembered locally
- The progress ring "erases" clockwise to show the remaining ratio, with a 1s linear transition forming a continuous, smooth animation (when half remains, exactly the left half is left)
- Click the palette button in the panel's top-right corner to switch between **5 component-level styles** that only affect the Pomodoro itself, decoupled from the global skin:
  - **Classic**: follows the global theme
  - **Tomato**: red fruit gradient ball + green leaf calyx on top
  - **Mint**: fresh sprout
  - **Ink**: black-and-white ink wash + solid lock + cinnabar red seal + monospace digits
  - **Amber**: vintage paper + Songti digits
- Each style has its own icon language: style-button preview icons, lock icons (line / solid), action-button icons (start / pause / skip / reset), and ambient-sound icons (none / rain / sea / water / fire)

### Session pinning

- Hover over a row in the sidebar session list to reveal a pin button; click to pin / unpin
- Pinned sessions automatically sort to the top of the list (within each group), with the pin always shown highlighted
- The pin set is remembered locally and persists after restart

### Color labels

- Hovering over a session row / workspace (folder) row reveals a color button; click to open a palette (8 preset colors); click a swatch to add a left color bar to that row
- The color bar is always visible; reopen the palette and click "Clear" to remove the color
- The color mapping is remembered locally and persists after restart

### Group by color

- In the workspace sidebar's **View options → Group by** menu there is a new "By color" entry; selecting it groups the session list by each session's color label (red → orange → … → uncolored), each with a colored group header + count
- Works regardless of the current grouping mode (it switches the list to a single flat list while active) and restores the previous grouping when turned off
- The toggle is remembered locally and persists after restart


### Session hover usage (turns + tokens)

- The hover card on a session row now shows an extra usage line under title / time / status: `28 turns · 46.7M tok in · 276K tok out`
- Data comes from two host-side session projections (same caliber as the stats row at the bottom of the conversation), read purely on the client — no host half needed:
  - `sessionStats.turns`: number of effective conversation turns
  - `tokenUsage`: input = uncached input + cache read + cache write, output = output tokens
- Turns and tokens are shown independently (whichever segment is missing is omitted); rows with conflicting titles (multiple sessions sharing the same name) are skipped without affecting the rest of the info

### Session navigation (back to top + turn timeline)

- **Back to top (↑)**: at the bottom-right of the conversation, directly above the system "jump to bottom (↓)" button, a symmetric "↑" button appears; clicking it first auto-loads all earlier history, then jumps to the very beginning of the conversation (the first message); it auto-hides when already at the top.
- **Turn timeline**: a vertical timeline appears on the right edge of the conversation (content column); each dot represents one turn (each message you send counts as one turn), positioned proportionally to its vertical location in the conversation:
  - Click a dot → smooth-scroll to that turn;
  - Hover a dot → a thumbnail card pops up (50-character summary of the start + send time, format `2026-09-10 15:13:16 Thu`);
  - The dot of the current turn is highlighted.
- The timeline only shows when the conversation has ≥ 2 turns; data and positioning come from the live DOM + session snapshot, implemented purely on the client — no host half needed.

### Roadmap

Intangible-heritage skins, session hiding, split-pane conversations (2/3/4 panes), session cloud storage, and more.

## 📦 Installation

```sh
dsh plugin --profile web add dsh-hestia
```

> Requires a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) environment first.

After installing, restart dsh and open "Settings → Plugins" to see `dsh-hestia`.

## 🛠 Local build

```sh
npm install
npm run build        # tsdown → lib/index.js (host half) + lib/client.js (client half)
npm run typecheck    # type checking
```

Build output is in `lib/`. For local debugging you can install the directory directly:

```sh
dsh plugin --profile web add file:/path/to/hestia-plugin
```

## 📂 Source layout

Features are split into modules under `src/client/`; the entry `index.ts` only does assembly.

```
src/
├── index.ts                  host half (empty apply)
└── client/
    ├── index.ts              entry: inject CSS, register skins, mount two slots
    ├── theme.ts              minimal theme service structure view (types)
    ├── styles.ts             aggregates each module's CSS (single injection point)
    ├── appearance/           "Appearance" panel
    │   ├── index.ts          AppearancePopover (entry button + popover)
    │   ├── width.ts          conversation width adjuster
    │   ├── font.ts           fonts (size / family)
    │   ├── background.ts     background wallpaper (upload / opacity)
    │   ├── skin.ts           skin system (pure black / pure white)
    │   └── styles.ts         dshwc-* CSS
    ├── pomodoro/             Pomodoro timer
    │   ├── index.ts          PomodoroBall (state machine / drag / panel)
    │   ├── style.ts          style themes (5 palettes + icon language + decorative motifs)
    │   ├── audio.ts          Web Audio ambient sounds + chimes
    │   ├── widgets.ts        Stepper / ProgressRing / lock, action, sound icons
    │   └── styles.ts         dshp-* CSS
    ├── pin/                  session pinning
    │   ├── index.ts          PinController (pin set / DOM reorder / pin button)
    │   └── styles.ts         dshpin-* CSS
    ├── color/                session color labels
    │   ├── index.ts          ColorController (color table / left color bar / palette)
    │   └── styles.ts         dshcolor-* CSS
    ├── group/                group-by-color
    │   ├── index.ts          ColorGroupingController (view-options menu injection / color grouping)
    │   ├── state.ts          cross-module toggle (defers pin reordering)
    │   └── styles.ts         dshgroup-* CSS
    ├── usage/                session hover token usage
    │   ├── index.ts          UsageController (read tokenUsage projection / inject hover card)
    │   └── styles.ts         dshusage-* CSS
    └── nav/                  session navigation (back to top + timeline)
        ├── index.ts          ConversationNavController (scroll container positioning / up arrow / timeline)
        └── styles.ts         dshnav-* CSS

cordis.patch.yml               plugin auto-mount config
tsdown.config.ts               build config
```

## 📄 License

[MIT](./LICENSE)
