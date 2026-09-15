<div align="center">
  <img src="assets/hestia-logo.png" width="360" alt="Hestia logo" />
  <h1>Hestia · DeepSeek Harness 会话增强插件</h1>
  <p><strong>让你的 AI 会话界面更顺手、更舒适。</strong><br>对话宽度 · 字体 · 皮肤 · 壁纸 · 番茄时钟 · 会话导航</p>
  <p><strong>简体中文</strong> · <a href="README.md">English</a></p>
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-d97706" alt="MIT license" /></a>
    <img src="https://img.shields.io/badge/node-%5E22.18.0%20%7C%7C%20%3E%3D24.11.0-339933" alt="Node.js ^22.18.0 || >=24.11.0" />
  </p>
</div>

Hestia 是一个独立仓库的 [DSH](https://github.com/deepseek-ai/deepseek-harness) 插件，通过 `dsh plugin add` 一键安装。在会话页头部提供「外观」设置，一站式调整对话宽度、字体、皮肤、壁纸，并附带番茄时钟（含 5 套可切换的风格主题）。

## ✨ 功能

会话页头部点「外观」按钮打开设置面板，所有选项自动记住。

### 对话宽度

- 滑块 + 预设（窄 / 标准 / 宽 / 超宽）调整对话列宽度，靠近预设自动吸附，手感顺滑

### 字体

- 字号：小 / 标准 / 大 / 特大
- 字体：默认 / 系统 / 宋体 / 黑体 / 微软雅黑 / 楷体 / 等宽

### 背景壁纸

- 上传本地图片作为对话区（消息区）背景，自动降采样压缩为 JPEG 后本地记忆，重启仍生效
- 透明度滑块（5% ~ 100%）调节壁纸浓淡；图片铺满消息区并居中显示，不随消息滚动
- 上传后按钮变为「更换图片」，旁边可预览缩略图，点「清除」一键恢复纯色背景

### 皮肤

- **纯白 / 纯黑**：一键切换浅色 / 深色界面

### 番茄时钟

- 右下角悬浮球常驻倒计时，专注 / 短休 / 长休自动循环
- 时长可调、位置可拖动、可选环境音（雨 / 海 / 水 / 火），时长 / 声音 / 位置 / 锁定均本地记忆
- 进度环顺时针「消逝」显示剩余比例，配 1s 线性过渡连成连续顺滑动效（剩一半时正好剩左半边）
- 点开面板右上角调色板按钮，可在 **5 套组件级风格**间切换，只影响番茄钟自身、与全局皮肤解耦：
  - **经典**：跟随全局主题
  - **番茄**：红果渐变球 + 顶部绿叶萼
  - **薄荷**：清新嫩芽
  - **墨**：黑白水墨 + 实心锁 + 朱砂红印 + 等宽数字
  - **琥珀**：复古纸张 + 宋体数字
- 每套风格带专属图标语言：风格按钮预览图标、锁图标（线稿 / 实心）、动作按钮图标（开始 / 暂停 / 跳过 / 重置）、环境音图标（无 / 雨 / 海 / 水 / 火）

### 会话置顶

- 侧栏会话列表，鼠标悬停某行会出现图钉按钮，点击即可置顶 / 取消置顶
- 已置顶的会话自动排到列表最前（每个分组内），图钉常显高亮
- 置顶集合记忆在本地，重启后仍生效

### 标识颜色

- 悬停会话行 / 工作区（文件夹）行出现颜色按钮，点击弹出调色板（8 种预设色），点色块即给该行加上左侧色条
- 色条常显；再次打开调色板点「清除」即可移除颜色
- 颜色映射记忆在本地，重启后仍生效

### 按标识颜色分组

- 工作区侧栏「视图选项 → 分组方式」菜单里新增「按标识颜色」一项，选中后按每个会话的标识颜色归组（红 → 橙 → … → 未上色），每组带颜色组头 + 数量
- 与当前分组模式无关（启用时临时切为单列表），关闭后还原原来的分组方式
- 开关记忆在本地，重启后仍生效


### 会话悬停用量（轮数 + token）

- 鼠标悬停会话行出现的悬停卡，在标题 / 时间 / 状态下方额外展示一行用量：`28 轮 · 输入 46.7M tok · 输出 276K tok`
- 数据来自 host 端两个会话投影（与对话底部统计行同口径），纯 client 读取，无需 host 半：
  - `sessionStats.turns`：有效对话轮数
  - `tokenUsage`：输入 = 未命中输入 + 缓存读 + 缓存写，输出 = 输出 token
- 轮数 / token 各自独立显示（缺哪段省略哪段）；标题冲突（多个会话同名）时该行跳过，不影响其余信息

### 会话导航（回到开头 + 轮次时间轴）

- **回到开头（↑）**：会话右下角、系统「跳到最底部（↓）」按钮正上方，对称地多出一个「↑」按钮，点击会先自动载入全部更早历史、再跳转到会话的**最最开头**（第一条消息）；已在顶部时自动隐藏。
- **轮次时间轴**：会话右侧（内容列右缘）出现一条竖向时间轴，每个小圆点代表一轮对话（以你发的每一条消息为一轮），位置按其在会话中的纵向位置等比例排布：
  - 点击圆点 → 平滑滚动到该轮位置；
  - 鼠标悬停圆点 → 弹出该轮缩略卡（开头 50 字摘要 + 发送时间，格式 `2026-09-10 15:13:16 周四`）；
  - 当前所在轮次的圆点高亮显示。
- 仅当会话存在 ≥ 2 轮时显示时间轴；数据与定位来自实时 DOM + 会话快照，纯 client 端实现，无需 host 半。

### 规划中

非遗皮肤、会话隐藏、对话框分割（2/3/4 分）、会话云盘存储等。

## 📦 安装

```sh
dsh plugin --profile web add dsh-hestia
```

> 需要先有 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 环境。

安装后重启 dsh，打开「设置 → Plugins」即可看到 `dsh-hestia`。

## 🛠 本地构建

```sh
npm install
npm run build        # tsdown → lib/index.js（host 半）+ lib/client.js（client 半）
npm run typecheck    # 类型检查
```

构建产物在 `lib/`。本地调试可直接装目录：

```sh
dsh plugin --profile web add file:/path/to/hestia-plugin
```

## 📂 源码结构

功能按模块拆分在 `src/client/` 下，入口 `index.ts` 只做装配。

```
src/
├── index.ts                  host 半（空 apply）
└── client/
    ├── index.ts              入口：注入 CSS、注册皮肤、挂载两个 slot
    ├── theme.ts              theme 服务最小结构视图（类型）
    ├── styles.ts             汇总各模块 CSS（单注入点）
    ├── appearance/           「外观」面板
    │   ├── index.ts          AppearancePopover（入口按钮 + 弹层）
    │   ├── width.ts          对话宽度调节器
    │   ├── font.ts           字体（字号 / 字体族）
    │   ├── background.ts     背景壁纸（上传 / 透明度）
    │   ├── skin.ts           皮肤系统（纯黑 / 纯白）
    │   └── styles.ts         dshwc-* CSS
    ├── pomodoro/             番茄时钟
    │   ├── index.ts          PomodoroBall（状态机 / 拖动 / 面板）
    │   ├── style.ts          风格主题（5 套配色 + 图标语言 + 装饰母题）
    │   ├── audio.ts          Web Audio 环境音 + 提示音
    │   ├── widgets.ts        Stepper / ProgressRing / 锁、动作、环境音图标
    │   └── styles.ts         dshp-* CSS
    ├── pin/                  session 置顶/pin
    │   ├── index.ts          PinController（pin 集合 / DOM 重排 / 置顶按钮）
    │   └── styles.ts         dshpin-* CSS
    ├── color/                session 标识颜色
    │   ├── index.ts          ColorController（色表 / 左侧色条 / 调色板）
    │   └── styles.ts         dshcolor-* CSS
    ├── group/                按标识颜色分组
    │   ├── index.ts          ColorGroupingController（视图选项菜单注入 / 颜色归组）
    │   ├── state.ts          跨模块开关（让 pin 跳过重排）
    │   └── styles.ts         dshgroup-* CSS
    ├── usage/                session 悬停 token 用量
    │   ├── index.ts          UsageController（读 tokenUsage 投影 / 注入悬停卡）
    │   └── styles.ts         dshusage-* CSS
    └── nav/                  会话导航（回顶 + 时间轴）
        ├── index.ts          ConversationNavController（滚动容器定位 / 上箭头 / 时间轴）
        └── styles.ts         dshnav-* CSS

cordis.patch.yml               插件自动挂载配置
tsdown.config.ts               构建配置
```

## 📄 License

[MIT](./LICENSE)
