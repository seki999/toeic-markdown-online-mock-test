# TOEIC Markdown Online Mock Test Platform

一个纯前端、Markdown 驱动的 TOEIC 风格在线练习与模拟考试网站。题库保存在 Repository 中；新增一套测试后提交并推送，GitHub Actions 会自动构建 GitHub Pages。Listening 不依赖 MP3/WAV，而由用户设备上的 Web Speech API 朗读。

> 示例题全部为原创 TOEIC-style mock questions，不复制真实 TOEIC 非公开试题。本项目与 ETS 无隶属或背书关系。

## 功能

- 覆盖 Listening Part 1–4 与 Reading Part 5–7 的统一内部模型。
- Practice Mode：按 Part 练习、播放/暂停/继续/停止、查看答案、Transcript 和解析。
- Exam Mode：Part 1–7 各自使用一张独立长页面。点击一次 Start 后自动连续播放 Listening Part 1–4，并在一个 Part 播放完后自动切换到下一 Part 页面，无需题组级 Next；Reading 按整个 Part 前后导航，统一提交后显示 Raw Score。
- Result：Listening、Reading、Total、Accuracy 及各 Part 明细。
- Review：按全部、错误、正确、未回答过滤；错误题可再次练习。
- LocalStorage：保存当前答案、历史结果、错题以及四个角色的 voice/rate 设置。
- Markdown parser：缺少 Answer、选择项或错误标题时返回可定位的错误，不让整个页面崩溃。
- 内容校验：检查正式考试题量、重复题号、答案与选择项数量；`demo: true` 允许缩短题量。
- Responsive：Part 7 桌面双栏、移动端上下排列，触控按钮不小于 44px。

## 内置题库

- `test-001`：完整原创英语模拟考试，Listening 100 + Reading 100，共 200 题；包含六张 Part 1 场景图、全部 Listening transcript、答案和逐题解析，`demo: false`。

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

1. 创建新的唯一目录，例如 `public/tests/test-new/`，放入 `metadata.md`、`part1.md` 至 `part7.md`，以及可选的 `vocabulary-coverage.md`。
2. 在 `metadata.md` 中使用与目录一致的唯一 `id`，正式 200 题测试设 `demo: false`。
3. 把整个 Markdown 文件夹加入 Repository 并推送到 `main`。不需要修改 Vue、TypeScript、JSON、Vite 或其他配置文件，也不要手工编辑 `public/tests/index.json`。
4. GitHub Actions 会在云端自动扫描 `public/tests/*/metadata.md`、检查七个 Part、生成 `index.json`、测试、构建并部署。部署成功后，新测试会自动显示在 Test library。

```text
MyChatGPT → Generate Markdown folder → public/tests/test-xxx/
→ add folder to Repository → push main
→ GitHub Actions auto-discovery → GitHub Pages → New Mock Test
```

## 生成完整题库的提示词

下面的提示词可以直接交给 ChatGPT、Codex 或其他能够创建项目文件的生成工具。使用前替换 `[TEST_ID]`、`[TEST_NUMBER]`、`[TARGET_SCORE]`，并把需要学习的 50、100 或其他数量的新单词粘贴到 `[VOCABULARY_LIST]`。建议每次使用新的 Test ID，已经发布的 ID 不要重复使用。

```text
请为当前 toeic-markdown-online-mock-test 项目生成一套完整、原创、可直接运行的 TOEIC-style Listening & Reading 模拟考试题库。

变量：
- TEST_ID: [TEST_ID]，例如 test-new
- TEST_NUMBER: [TEST_NUMBER]，例如 003
- TARGET_SCORE: [TARGET_SCORE]，例如 600-850
- VOCABULARY_LIST: 用户本次希望学习的新单词。可以每行一个、使用编号列表或使用逗号分隔，也可以在单词后附中文释义或英文释义。

用户输入的新单词：
[VOCABULARY_LIST]

一、基本要求

1. 在 public/tests/[TEST_ID]/ 下创建完整题库，不要修改其他已经存在的题库。
2. 只创建 Markdown 文件：metadata.md、part1.md、part2.md、part3.md、part4.md、part5.md、part6.md、part7.md、vocabulary-coverage.md。不要创建或修改 JavaScript、TypeScript、Vue、JSON、YAML、SVG、配置文件、脚本或测试文件。
3. Part 1 直接使用项目已经提供的 6 张共享场景图，不要生成新的图片文件。可用路径是：images/toeic-scenes/office-meeting.svg、images/toeic-scenes/train-platform.svg、images/toeic-scenes/restaurant.svg、images/toeic-scenes/warehouse.svg、images/toeic-scenes/park.svg、images/toeic-scenes/construction.svg。
4. 全套必须正好 200 题：Listening 100 题，Reading 100 题。
5. 所有题目、选项、听力原文、答案和解析都使用自然、准确的英语。
6. 内容必须原创，只能创作 TOEIC-style 模拟题，不得复制、改写或声称使用 ETS 的真实、泄露或非公开试题。不要使用 TOEIC 官方商标图形。
7. 使用现实的职场和日常商务场景，例如办公室、会议、出差、酒店、餐厅、零售、运输、物流、招聘、设施维护、客户服务和活动安排。避免机械重复的题干与模板。
8. 难度以 medium 为主，并与 [TARGET_SCORE] 相符。正确答案 A/B/C/D 应尽量均衡分布；Part 2 使用 A/B/C。错误选项必须合理但能由原文明确排除。
9. 每个题号在整套题库中必须唯一且连续。不得缺题、重复题号、缺选项、缺答案或缺解析。
10. 正式题库必须设置 demo: false。不要在题库标题、正文或 UI 文案中加入 DEMO。
11. 严格遵守 docs/TOEIC-MD-SPEC.md 的 heading、Speaker、Answer、Explanation、Tags 和 Passage 语法。文件编码使用 UTF-8，不要加入 Parser 不支持的自定义 HTML。
12. 不创建 MP3/WAV。Listening 由浏览器 TTS 朗读，题库 Audio 只使用 Narrator、Speaker 1、Speaker 2、Speaker 3 标签。
13. 不要在 Markdown 中写计时命令、暂停标记、分页或 Next 操作。考试模式由网站把 Part 1–7 分别显示为独立长页面；用户点击一次 Start 后，Part 1–4 自动连续播放并在 Part 边界自动换页。题号朗读、问题/选项朗读和作答间隔也由网站代码统一加入。

二、用户输入词表和覆盖规则

1. 开始生成前，解析 [VOCABULARY_LIST]，去除空行，合并完全重复的单词，并统计有效单词数量。若词表为空、仍是占位符或无法辨认，先停止生成并请用户提供词表，不要自行虚构一份词表。
2. 必须覆盖每一个有效输入单词。每个单词至少一次出现在真正的考试内容中，即 Audio、Passage、题干或选项；只出现在 Explanation、Tags、标题或覆盖报告中不算完成覆盖。
3. 单词必须按照正确词义、词性和自然搭配进入真实的 TOEIC 商务语境。可以使用语法所需的复数、时态、比较级或其他自然词形，但不得为了保留原形而写出不自然的英语。
4. 如果用户为单词提供了指定释义，必须按照该释义设计语境；没有提供释义时，选择常见且适合职场英语的词义。多义词不要在同一道题中制造无法判断的歧义。
5. 把单词分散到 Part 1-7，并同时覆盖 Listening 与 Reading。Part 1 只使用能够从图片观察到或自然描述的词，不要为了平均分配而破坏图片与句子的对应关系。
6. 一部分单词可以成为 Part 5/6 的词汇考点，其他单词应自然进入对话、讲话、邮件、通知、聊天、广告和文章。不要让所有输入单词都成为正确选项，也不要在同一句中生硬堆放多个新单词。
7. 题目应该测试对语境和含义的理解，而不是简单地看到输入单词就能猜出答案。错误选项不能只靠拼写差异排除。
8. 在 public/tests/[TEST_ID]/ 下额外创建 vocabulary-coverage.md。该文件不参与评分，用于审核词表覆盖情况，必须逐项记录：原始单词、实际使用词形、使用位置（Part 和题号或 Group）、使用句子/材料的简短定位、采用的词义。
9. vocabulary-coverage.md 中的每个输入单词至少有一条有效位置记录。生成完成后重新扫描 part1.md 至 part7.md，确认记录的位置真实存在；不得伪造覆盖结果。
10. 如果输入包含 50 个单词，应覆盖全部 50 个；输入包含 100 个单词，应覆盖全部 100 个。其他数量同样按实际去重后的有效词数全部覆盖，而不是只选择其中一部分。

三、Metadata

public/tests/[TEST_ID]/metadata.md 必须包含：

---
id: [TEST_ID]
title: TOEIC Complete Mock Test [TEST_NUMBER]
version: "1.0"
difficulty: medium
targetScore: [TARGET_SCORE]
listeningQuestions: 100
readingQuestions: 100
demo: false
---

# TOEIC Complete Mock Test [TEST_NUMBER]

并加入一句简短声明，说明整套问题、transcripts、answers 和 explanations 均为本项目原创内容。

四、题量和题号

- Part 1：Question 1-6，共 6 题。
- Part 2：Question 7-31，共 25 题。
- Part 3：Question 32-70，共 39 题；13 个 conversation group，每组 3 题。
- Part 4：Question 71-100，共 30 题；10 个 talk group，每组 3 题。
- Part 5：Question 101-130，共 30 题。
- Part 6：Question 131-146，共 16 题；4 个 passage group，每组 4 题。
- Part 7：Question 147-200，共 54 题；包含 single、double、triple passage groups，并保证题目总数正好为 54。为这个项目生成 18 个材料组：6 个 single、6 个 double、6 个 triple；合理分配每组题数，使总题数和连续题号严格正确。

五、各 Part 内容要求

Part 1：
- 每题包含 Image、Audio、Answer、Explanation、Tags。
- 6 道题分别使用一张项目内置共享图，Image 必须填写 `images/toeic-scenes/` 下的完整路径；不要引用 [TEST_ID] 目录中的图片，也不要创建图片。
- 先根据共享场景图设计 A-D 描述，正确答案必须与图中可观察内容一致。
- Audio 包含 Speaker 1 朗读的 A-D 四个完整描述句。Explanation 必须说明图中哪个可见细节支持正确答案。
- 不要在 Audio 中手工添加 `Question 1.`、`Question 2.` 等题号，也不要写暂停时间。考试模式会自动把对应题号与该题 A 选项合并为一个稳定的朗读单元，例如 `Question 2. A. ...`，避免浏览器跳过过短的独立题号；该题结束后自动留出5秒作答时间。手工添加题号会造成重复朗读。

Part 2：
- 每题 Audio 先由 Speaker 1 朗读一个问题或陈述，再由 Speaker 2 依次朗读 A-C 三个回答。
- 正确回答应包含直接回答、间接回答、请求回应、建议回应等多种类型，不能全部依赖关键词复述。
- 每题必须包含 Answer、Explanation、Tags。
- 不要写暂停标记；考试模式会在每题 Audio 结束后自动留出5秒作答时间。

Part 3：
- 每组使用 ## Group N、### Questions、### Audio、3 个 ### Question、### Answers、### Explanation、### Tags。
- Audio 首行由 Narrator 说明题号范围，之后使用 2-3 位 Speaker 展开自然商务对话。
- 每组 3 题应混合主旨、细节、意图、推断和下一步行动。Explanation 下必须为每题分别建立 #### Question N。
- Audio 只写 Narrator 引导和 conversation transcript，不要在 Audio 中再次复制三道题及选项。考试模式会在对话后自动读取各 Question 和 A-D，并在每题后留出8秒作答时间。

Part 4：
- 结构与 Part 3 相同，但材料是 announcement、telephone message、advertisement、news report、tour information 或 workplace talk。
- Audio 首行必须是 Narrator，正文通常由 Speaker 1 连续朗读。
- 每组必须有完整 transcript、3 道题、答案映射和逐题解析。
- Audio 不要重复 Question 和选项，也不要写暂停标记。考试模式会在 talk 后自动朗读各 Question 和 A-D，并在每题后留出8秒作答时间。

Part 5：
- 每题包含一个自然的句子填空、A-D、Answer、Explanation、Tags，可选 Vocabulary。
- 题目覆盖词性、时态、语态、主谓一致、介词、连词、关系从句、代词、比较结构和商务词汇。
- Explanation 要解释具体语法或词义依据，不能只写正确字母。

Part 6：
- 创建 4 个不同类型的 Passage Group，每组 4 题。
- 材料可以是 email、notice、article、letter 或 memo。
- 题型应混合词汇、语法、句子插入和阅读理解，并使用项目规范中的 _____ 与 **[1]** 标记。
- 每题均包含 A-D、Answer、Explanation；材料必须连贯，插入句必须只有一个合理位置。

Part 7：
- 使用 ## Passage Group N、### Type、### Passage 1/2/3、材料类型 heading、Questions、Answers 和 Explanations。
- single 必须只有一份材料，double 必须有两份，triple 必须有三份。
- 材料类型应多样，包括 Email、Notice、Advertisement、Article、Chat、Schedule、Invoice、Web Page 和 Memo；需要时使用标准 Markdown table。
- double/triple 的部分问题必须要求交叉对照两份或三份材料，而不是所有答案都能从单一材料直接找到。
- 题型覆盖主旨、事实细节、NOT/EXCEPT、词义、意图、推断、信息配对和文本插入。每题都必须有明确答案及证据充分的解析。

六、质量与格式要求

- 不要输出占位符、TODO、未完成段落、"其余题目同上" 或省略号代替内容。
- 不要把正确答案直接泄露在题干、标签或格式中。
- 同一组问题必须与对应 Audio/Passage 完全一致，姓名、日期、时间、价格、地点和数量不得前后矛盾。
- Explanation 应简洁说明文本证据或语法原因；不能只重复选项。
- Tags 使用简短、稳定、小写、连字符分隔的英文词。
- Markdown heading 层级必须与 docs/TOEIC-MD-SPEC.md 完全一致。
- Part 1/2 的听力内容和选项写入 Audio；Part 3/4 只把 Narrator 引导及 conversation/talk transcript 写入 Audio，三道 Question 和 choices 保持在规定的 Question sections 中，由网站自动接入播放队列。
- Part 1 不得手工加入题号；Part 3/4 不得把已经存在的 Question/choices 再复制到 Audio。连续播放、Part 1 题号、Part 3/4 问题与选项、5秒/8秒作答间隔和 Part 切换缓冲均由网站自动生成。
- 不得手工把题库内容写入 Vue、TypeScript、评分逻辑或 public/tests/index.json。
- 不得遗漏用户输入词表中的任何有效单词，也不得只在 Explanation 或 vocabulary-coverage.md 中制造表面覆盖。

七、交付边界和内容自检

你的任务只生成 `public/tests/[TEST_ID]/` 中的 Markdown 文件，不要在本地安装依赖、启动服务器、运行 `npm run generate:index`、运行测试或执行构建。不要修改 `public/tests/index.json`；该文件会在题库文件夹被推送后由 GitHub Actions 自动生成。

交付前直接检查所生成的 Markdown 内容，修复题数、题号、答案、选项、共享图片路径或 heading 格式错误。最后报告：

- 实际创建的文件列表
- Part 1-7 各自题数
- Listening、Reading 和总题数
- transcript、答案、解析和 Part 1 图片是否齐全
- 用户输入词表的原始条目数、去重后的有效单词数、已覆盖数和未覆盖数
- vocabulary-coverage.md 的路径，以及每个单词是否都能对应到真实的 Part/Question/Group
- 已确认只创建 Markdown 文件，未修改项目代码、配置或 `index.json`
- 提醒用户把整个 `public/tests/[TEST_ID]/` 文件夹加入 Repository；后续发现、测试、构建和发布均由 GitHub Actions 自动完成

请直接创建全部 Markdown 文件，不要只提供计划或少量示例，也不要执行任何本地编译或运行命令。
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

`TtsEngine` 是唯一可直接调用 `window.speechSynthesis` 的模块。用户点击一次 `Start test` 满足浏览器的播放手势要求后，Exam Mode 会自动连续朗读 Part 1–4，不再要求逐题点击 Play 或 Next。每个 Part 是一张独立长页面；当前 Part 播放完成后，系统自动打开并播放下一 Part。普通 Narrator 行后等待约500ms、其他角色间等待约300ms；Part 1/2 每题后留5秒，Part 3/4 自动朗读问题和选项并在每题后留8秒，Part 切换再增加3秒缓冲。这些是 TOEIC-style 模拟节奏，不宣称是官方精确计时。

Part 1 的 Markdown 只保存 A-D 描述，连续播放队列会自动把 `Question N.` 接到对应 A 选项前组成同一个朗读单元；Part 3/4 的 Markdown 保存完整 conversation/talk、Question 和 choices，播放队列会在材料后自动组合并朗读它们。这样新增题库只需要正确的 Markdown，不需要自行编码题号或计时。

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

- 显示 Raw Score，不伪造官方 scaled TOEIC score。
- TTS 音质、voice 和 pause 行为取决于设备；未上传任何音频。
- LocalStorage 不跨设备同步，也没有登录、云端历史或防作弊系统。
- Part 1 可直接引用 `public/images/toeic-scenes/` 中的共享 SVG；因此新增题库可以只包含 Markdown 文件。
- Exam Mode 提供合理的流程限制，但不尝试复制正式考场的全部计时与监管规则。

## 后续扩展

可以增加正式 200 题内容、计时器、基于 tags 的弱项统计、可选的无障碍高对比主题、内容 JSON Schema/CLI 校验，以及不改变 Raw Score 事实边界的官方换算表引用。第一版有意不加入后端和大型 UI 框架。
