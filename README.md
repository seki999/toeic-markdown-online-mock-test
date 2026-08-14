# TOEIC Markdown Online Mock Test Platform

一个纯前端、Markdown 驱动的 TOEIC 风格在线练习与模拟考试网站。题库保存在 Repository 中；新增一套测试后提交并推送，GitHub Actions 会自动构建 GitHub Pages。Listening 不依赖 MP3/WAV，而由用户设备上的 Web Speech API 朗读。

> 示例题全部为原创 TOEIC-style mock questions，不复制真实 TOEIC 非公开试题。本项目与 ETS 无隶属或背书关系。

## 功能

- 覆盖 Listening Part 1–4 与 Reading Part 5–7 的统一内部模型。
- Practice Mode：按 Part 练习、播放/暂停/继续/停止、查看答案、Transcript 和解析。
- Exam Mode：Listening 顺序前进，Reading 可前后导航；统一提交后显示 Raw Score。
- Result：Listening、Reading、Total、Accuracy 及各 Part 明细。
- Review：按全部、错误、正确、未回答过滤；错误题可再次练习。
- LocalStorage：保存当前答案、历史结果、错题以及四个角色的 voice/rate 设置。
- Markdown parser：缺少 Answer、选择项或错误标题时返回可定位的错误，不让整个页面崩溃。
- 内容校验：检查正式考试题量、重复题号、答案与选择项数量；`demo: true` 允许缩短题量。
- Responsive：Part 7 桌面双栏、移动端上下排列，触控按钮不小于 44px。

## 内置题库

- `test-001`：24 题功能演示题库，`demo: true`。
- `test-002`：完整原创英语模拟考试，Listening 100 + Reading 100，共 200 题；包含六张 Part 1 场景图、全部 Listening transcript、答案和逐题解析，`demo: false`。

## 技术栈

Vue 3、TypeScript、Vite、Pinia、Vue Router、markdown-it、js-yaml、Web Speech API、Vitest、GitHub Actions / Pages。没有后端、数据库、音频生成、Docker 或云服务依赖。

## 架构

```text
public/tests/*.md
  → Markdown Parser
  → Internal Test Model
  → Exam / Scoring / Validation / TTS Engines
  → Vue UI + Pinia
  → LocalStorage
```

内容不能写入 Vue 组件或评分代码。详细边界和数据流见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，内容作者必须遵循 [docs/TOEIC-MD-SPEC.md](docs/TOEIC-MD-SPEC.md)。

## 项目目录

```text
public/tests/              Markdown 题库与自动生成的 index.json
scripts/                   题库索引生成脚本
src/components/            可复用题目和 TTS 控件
src/services/              Parser、loader、TTS、评分、校验
src/stores/                Pinia 答案/结果/voice 设置
src/views/                 Home、Practice、Exam、Result、Review、Settings
docs/                      内容规范和架构文档
.github/workflows/         GitHub Pages workflow
```

## 本地启动

推荐 Node.js 22.18+（当前依赖的完整受支持运行时）。

```bash
npm install
npm run generate:index
npm run dev
```

Vite 会输出本地 URL。浏览器voice 列表依赖操作系统，首次打开 Settings 时可点击 “Refresh available voices”。

生产检查：

```bash
npm test
npm run build
npm run preview
```

`npm run build` 会先重新生成 `public/tests/index.json`，再执行 TypeScript 检查和生产构建。

## 新增一套 TOEIC Test

1. 复制 `public/tests/test-001/` 为新的唯一目录，例如 `test-002/`。
2. 编辑 `metadata.md`，至少修改 `id` 和 `title`。正式 200 题测试设 `demo: false`。
3. 按 TOEIC-MD-SPEC 编写 `part1.md` 至 `part7.md`。题号必须在整套测试内唯一。
4. 执行 `npm run generate:index`；不要手工长期维护 `index.json`。
5. 执行 `npm test && npm run build`。
6. `git add`、`git commit`、`git push`。Pages workflow 会自动发布，新测试会出现在首页。

```text
MyChatGPT → Generate Markdown → public/tests/test-xxx/
→ git add → git commit → git push
→ GitHub Actions → GitHub Pages → New Mock Test
```

## Markdown 与 Speaker

每个 Part 只有一个 Markdown 文件。Listening 的语音块使用严格标签：

```markdown
### Audio

Narrator:
Questions 32 through 34 refer to the following conversation.

Speaker 1:
Have you reserved the room?

Speaker 2:
I'll check it now.
```

仅支持 `Narrator`、`Speaker 1`、`Speaker 2`、`Speaker 3`。不要写操作系统特有的 voice 名称；角色到 voice 的映射属于用户设置，不属于题库。

## Browser TTS 原理与限制

`TtsEngine` 是唯一可直接调用 `window.speechSynthesis` 的模块。它把 `SpeechLine[]` 顺序送入 `SpeechSynthesisUtterance`，在 Narrator 后等待约 500ms、其他角色间等待约 300ms，并在新播放或离开页面时 `cancel()`，避免重叠。手机浏览器通常要求播放由点击触发，因此页面绝不自动朗读。

Web Speech API 没有标准的 voice 性别字段，voice 名称和数量也因 Windows、macOS、Android、Chrome、Edge、Safari 而异。系统会优先轮换可用英语 voice，数量不足时安全回退；用户选择始终优先。某些移动浏览器的 pause/resume 行为由浏览器实现决定。

## LocalStorage

- `toeic-md-platform-v1`：按 test ID 保存答案及已提交的考试历史。
- `toeic-md-voice-settings-v1`：保存角色 voiceURI 与 Practice speech rate。

数据仅在当前浏览器 profile 中；清除网站数据会删除记录。题库更新后，旧结果仍保留原始答案和 raw score，但 Review 依赖当前题目 ID，因此发布后不应复用或重排既有题号。

## GitHub Pages 部署

1. 推送到 `main`。
2. Repository → Settings → Pages → Source 选择 **GitHub Actions**。
3. `.github/workflows/deploy.yml` 执行 `npm ci`、tests、build，然后上传 `dist/`。

Vite 使用 `base: './'`，Vue Router 使用 hash history，因此同时兼容 `https://USERNAME.github.io/REPOSITORY/` 与 localhost，不需要提前写死用户名或 Repository 名。

## 当前限制

- `test-001` 仅用于快速功能演示；正式完整题量请使用 `test-002`。
- 显示 Raw Score，不伪造官方 scaled TOEIC score。
- TTS 音质、voice 和 pause 行为取决于设备；未上传任何音频。
- LocalStorage 不跨设备同步，也没有登录、云端历史或防作弊系统。
- Part 1 demo 使用内置视觉占位插画；内容作者可按规范提供自己的图片。
- Exam Mode 提供合理的流程限制，但不尝试复制正式考场的全部计时与监管规则。

## 后续扩展

可以增加正式 200 题内容、计时器、基于 tags 的弱项统计、可选的无障碍高对比主题、内容 JSON Schema/CLI 校验，以及不改变 Raw Score 事实边界的官方换算表引用。第一版有意不加入后端和大型 UI 框架。
