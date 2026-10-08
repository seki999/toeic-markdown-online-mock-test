# TOEIC Markdown Online Mock Test Platform

一个纯前端、Markdown 驱动的 TOEIC 风格在线练习与模拟考试网站。题库保存在 Repository 中；新增一套测试后提交并推送，GitHub Actions 会自动构建 GitHub Pages。Listening 不依赖 MP3/WAV，而由用户设备上的 Web Speech API 朗读。

> 示例题全部为原创 TOEIC-style mock questions，不复制真实 TOEIC 非公开试题。本项目与 ETS 无隶属或背书关系。

## 功能

- 覆盖 Listening Part 1–4 与 Reading Part 5–7 的统一内部模型。
- Practice Mode：按 Part 练习、播放/暂停/继续/停止、查看答案、Transcript 和解析。
- Exam Mode：Part 1–7 各自使用一张独立长页面，顶部 Part 菜单可随时自由切换。点击一次 Start 后自动连续播放 Listening Part 1–4，并在一个 Part 播放完后自动切换到下一 Part 页面，无需题组级 Next；从菜单选择 Listening Part 会停止当前朗读并从所选 Part 开头播放。Reading 按整个 Part 前后导航，统一提交后显示 Raw Score。
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

下面的提示词可以直接交给 ChatGPT、Codex 或其他能够创建项目文件的生成工具。使用前替换 `[TEST_ID]`、`[TEST_NUMBER]`、`[TARGET_SCORE]`，并把需要学习的全部新单词粘贴到 `[VOCABULARY_LIST]`。

使用时必须让生成工具能够读取项目根目录的 `托业阅读题.pdf` 和 `托业听力题.pdf`；若在 ChatGPT 等无法访问本地文件的环境使用，请同时附上这两份 PDF。它们用于校准题型、形式与难度，生成内容仍须原创。

本提示词支持大规模词表：50、100、200、500、1000 个或更多有效单词。无论词表多大，都不得默默截断、抽样或只挑“重要词”；必须以 100% 覆盖为验收条件。建议每次使用新的 Test ID，已经发布的 ID 不要重复使用。

~~~text
请为当前 https://github.com/seki999/toeic-markdown-online-mock-test 项目生成一套完整、原创、可直接加入 Repository 的 TOEIC-style Listening & Reading 模拟考试题库。

变量：
- TEST_ID: [TEST_ID]，例如 test-003
- TEST_NUMBER: [TEST_NUMBER]，例如 003
- TARGET_SCORE: [TARGET_SCORE]，例如 600-850
- READING_REFERENCE_PDF: 项目根目录的 托业阅读题.pdf（本地路径：C:\Users\seki9\Documents\toeic-markdown-online-mock-test\托业阅读题.pdf）
- LISTENING_REFERENCE_PDF: 项目根目录的 托业听力题.pdf（本地路径：C:\Users\seki9\Documents\toeic-markdown-online-mock-test\托业听力题.pdf）
- VOCABULARY_LIST: 用户本次希望学习的新单词。可以每行一个、编号列表、逗号分隔，也可以带中文释义、英文释义或词性。

用户输入的新单词：
[VOCABULARY_LIST]

生成前必须完成：参考 PDF 校准

1. 必须先读取上述两份 PDF 的实际内容，包括页面上的图片、表格、表单、聊天记录及多材料布局；不能仅依据文件名或通用 TOEIC 知识声称已参照。优先使用项目根目录文件，无法访问本地路径时使用用户附上的同名 PDF；若任一文件缺失或无法读取，明确报告并请求提供可读文件，不得跳过参照要求直接生成正式题库。
2. 按实际 Part 标题识别参考范围，不要假定两份文件各自仅含听力或阅读。当前 托业阅读题.pdf 主要提供 Part 6～7；托业听力题.pdf 同时包含 Part 1～4 和 Part 5～7，因此 Part 5 也必须从后者校准。
3. 在正式生成前简要列出参考文件、实际覆盖的 Part、代表性页码，以及各 Part 的题型、设问方式、选项结构、场景、材料长度和信息密度特征。区分直接观察到的特点与生成时自行设定的参数。听力 PDF 未提供完整录音或逐字稿，不得声称已验证其语速、口音、对话词数或完整听力内容；原创 Transcript 只能依据可见设问、场景及题型设计，并说明这一限制。
4. 难度必须以两份 PDF 为基准，再在该基准上结合 [TARGET_SCORE] 调整。综合校准词汇常见程度、句法复杂度、信息密度、同义改写、推断步骤及干扰项相似度，不得仅用 medium 标签代表难度。以常见职场和日常商务英语为主，适量加入语境推断和跨材料整合；不要依赖冷僻专业知识，也不要把所有题目简化为原文关键词匹配。未指定 [TARGET_SCORE] 时保持参考材料的整体难度。
5. 各 Part 的形式参照要求：
   - Part 1：参照图片描述的观察粒度、动作、状态及空间关系；四个陈述中仅一个与图像事实一致。实际出题仍使用本项目规定的六张共享图并遵守历史去重要求，不复制参考 PDF 的照片或原题。
   - Part 2：一个问句或陈述配三个应答，混合直接回答和自然的间接应答；干扰项可利用近音、关键词重复、答非所问等机制，但不得产生两个合理答案。参考文件未展示具体应答文本，这些是原创设计要求，不得冒充从 PDF 提取的例题。
   - Part 3～4：每组材料三题、每题四个选项，结合人物身份、地点、主旨、细节、原因、下一步行动及话语含义；参照 PDF 中的图表结合题设计信息整合，而非让三题都考相邻句子的字面复述。需要图表时仅使用 docs/TOEIC-MD-SPEC.md 和当前 Parser 已支持的呈现方式；无法呈现则改用兼容的信息整合题，并在交付报告说明，不得出现没有可见图表的“Look at the graphic”题。
   - Part 5：单句留空、四个选项，兼顾词性、词形、时态语态、代词、介词、连接词、词义及商务搭配；选项长度和句子复杂度参照 PDF，避免所有题都变为目标词释义测试。
   - Part 6：参照邮件、通知、产品说明和宣传材料等体裁，每组四题；同时覆盖语法/词汇、上下文衔接和整句填入，整句题须依赖段落逻辑，不能脱离全文作答。
   - Part 7：参照表单、收据、文章、邮件、网页、广告、聊天、日程及评论等多种材料；保留必要的日期、时间、金额、身份、邮件字段和表格关系。覆盖目的、细节、暗示、语境词义、话语意图、句子位置及跨材料推断；double/triple 必须有需要结合不同材料才能作答的题，不能只是把互不相关的文章拼在一起。
6. 参照的是题型、语言水平、材料组织和考查机制，所有人物、机构、情境、数据、正文、问题与选项必须重新原创；不得逐题换名、替换数字或近义改写参考试题，不得复制其中的商标、照片或受保护内容。
7. 形式相似不等于复制 PDF 排版。输出必须遵守本项目的 Markdown/Parser 契约，以及下文明确规定的 200 题、题号、分组、共享图和文件边界；参考 PDF 的材料组数量或版式不覆盖这些要求。
8. 大规模词表覆盖不得破坏参照难度：优先自然分配目标词到不同材料，保持同类参考材料的篇幅和信息密度，不得靠超长段落、重复堆词或生硬句法实现覆盖。若 200 题、全部词汇覆盖与参考难度无法同时满足，明确列出冲突并请求调整约束，不得伪报完成。

一、最终目标

1. 在 public/tests/[TEST_ID]/ 下创建一套正式 TOEIC-style 模拟考试题库。
2. 全套严格 200 题：Listening 100 题，Reading 100 题。
3. Part 1～Part 7 完整，metadata 中 demo: false。
4. 所有 Questions、Options、Listening transcripts、Passages、Answers、Explanations 必须完整。
5. 所有用户输入的有效目标词都必须进入真实考试内容。
6. 无论输入 50、100、200、500、1000 个或更多有效单词，都不得主动截断为前 N 个，不得随机抽样，不得只选择其中一部分。
7. 目标词很多时仍保持总题数严格为 200；不要采用“一词一题”的思路，而应让对话、讲话和阅读材料自然承载多个目标词。
8. 最终必须创建 vocabulary-coverage.md，并满足：
   - Vocabulary coverage: 100%
   - Missing vocabulary: 0

二、文件边界

只允许在 public/tests/[TEST_ID]/ 下创建以下 Markdown 文件：

- metadata.md
- part1.md
- part2.md
- part3.md
- part4.md
- part5.md
- part6.md
- part7.md
- vocabulary-coverage.md

不要修改其他已经存在的题库。

不要创建或修改：
- JavaScript
- TypeScript
- Vue
- JSON
- YAML 配置文件
- SVG
- 图片
- 配置文件
- GitHub Actions
- 脚本
- 测试文件
- public/tests/index.json

三、大规模词表处理

开始生成正式题库之前，先完整解析 [VOCABULARY_LIST]：

1. 读取全部输入，不得只读取前面一部分。
2. 去除空行、纯编号、无意义符号和无法识别的项目。
3. 合并完全相同的重复词条。
4. 如果相同拼写明确指定了不同词义或词性，可以作为不同学习项目保留。
5. 统计：
   - Raw vocabulary entries
   - Invalid entries removed
   - Duplicate entries merged
   - Valid vocabulary items
6. 为所有有效目标词建立内部 Coverage Plan，再开始正式生成 Part 1～7。
7. Coverage Plan 至少为每个词规划：
   - Part
   - Question 或 Group
   - Audio / Passage / Question / Option 中的真实承载位置
8. Coverage Plan 只是规划，不能直接作为最终覆盖证明。完成全部题库后必须重新扫描最终 part1.md～part7.md，以最终文件中的实际内容为准。

四、目标词的有效覆盖定义

每个有效目标词至少一次出现在真实考试内容中。

以下位置算有效覆盖：
- Listening Audio
- conversation transcript
- talk transcript
- Reading Passage
- Email
- Notice
- Advertisement
- Article
- Chat
- Schedule
- Invoice
- Web Page
- Memo
- Question stem
- Answer option

以下位置单独出现不算覆盖：
- Explanation
- Tags
- Markdown heading
- metadata.md
- vocabulary-coverage.md

不得在 vocabulary-coverage.md 中写一个不存在于实际正文的位置来伪造覆盖。

五、大词表分配策略

当有效目标词超过 200，特别是达到 500、1000 或更多时：

1. 不增加题数，仍保持正式考试 200 题。
2. 不要求每个目标词成为一道独立考题。
3. 不要求每个目标词成为正确答案。
4. 允许一个 conversation、talk 或 Passage 自然覆盖多个目标词。
5. Part 3、Part 4、Part 6、Part 7 应承担大部分大规模词汇覆盖。
6. Part 7 是大词表的主要承载区域，可以适当增加阅读材料长度，但不得增加 Question 数量。
7. Part 6 的 Passage 可以适度丰富，以自然覆盖更多词汇。
8. Part 1 只允许使用图片真实支持的目标词。
9. Part 2 以自然口语为第一优先级，不能为了塞词破坏问答自然度。
10. 普通短句原则上不要强行堆放多个生僻词；较长对话和文章可以自然使用多个目标词。
11. 不得把剩余未覆盖词一次性堆进某一个 Passage。
12. 不得写成“词汇清单式文章”。

如果输入约 500 个词，可参考以下非硬性分配思路：
- Part 1：0～10
- Part 2：20～50
- Part 3：80～130
- Part 4：60～100
- Part 5：50～100
- Part 6：50～100
- Part 7：150～250

允许同一目标词在多个位置自然重复。唯一硬性要求是全部有效目标词至少有一次真实覆盖。

六、词义和词形

1. 单词必须按照正确词义、词性和自然搭配进入真实 TOEIC / 商务语境。
2. 如果用户提供了指定释义，必须优先按指定释义设计语境。
3. 没有提供释义时，选择常见且适合职场英语的词义。
4. 多义词不要制造无法判断的歧义。
5. 允许自然词形变化，例如：
   - 单复数
   - 过去式
   - 过去分词
   - 第三人称单数
   - -ing
   - 比较级 / 最高级
6. 不能用完全不同的派生词冒充原词覆盖。例如输入 economy，仅出现 economic，默认不能算 economy 已覆盖，除非用户明确允许词族覆盖。
7. vocabulary-coverage.md 必须同时记录 Original 和 Actual form。

七、Vocabulary Coverage Report

创建 public/tests/[TEST_ID]/vocabulary-coverage.md。

至少使用以下字段：

| No. | Original | Actual form | Part | Location | Context | Meaning |
|---:|---|---|---|---|---|---|

每一个有效目标词至少有一条真实记录。

完成全部 Part 后，重新扫描 part1.md～part7.md，根据最终正文生成或修正该报告。

报告底部必须统计：

- Raw vocabulary entries:
- Invalid entries removed:
- Duplicate entries merged:
- Valid vocabulary items:
- Covered vocabulary items:
- Missing vocabulary items:

最终必须满足：

Covered vocabulary items == Valid vocabulary items

Missing vocabulary items == 0

如果 Missing 不等于 0：
1. 不要结束任务。
2. 找到最自然的 Part / Group / Passage 补入遗漏词。
3. 必要时重写对应句子、对话或材料。
4. 再次扫描全部 Part。
5. 持续修复直到 Missing = 0。

不得以“词太多”为理由交付未覆盖词。

八、Metadata

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

加入一句简短声明，说明整套 Questions、Transcripts、Answers 和 Explanations 均为本项目原创 TOEIC-style 学习内容。

不得声称内容来自 ETS。

九、题量和题号

必须严格保持：

- Part 1：Question 1-6，共 6 题。
- Part 2：Question 7-31，共 25 题。
- Part 3：Question 32-70，共 39 题；13 个 conversation group，每组 3 题。
- Part 4：Question 71-100，共 30 题；10 个 talk group，每组 3 题。
- Part 5：Question 101-130，共 30 题。
- Part 6：Question 131-146，共 16 题；4 个 passage group，每组 4 题。
- Part 7：Question 147-200，共 54 题；18 个材料组：6 个 single、6 个 double、6 个 triple；合理分配每组题数，使总数严格为 54。

最终：
- Listening = 100
- Reading = 100
- Total = 200

Question ID 必须 1～200 连续、唯一、无缺号、无重复。

十、原创与质量要求

1. 所有内容必须原创，只创作 TOEIC-style 模拟题。
2. 不得复制、改写、引用或声称使用 ETS 的真实、泄露或非公开试题。
3. 不使用 TOEIC 官方商标图形。
4. 使用真实职场和日常商务场景，例如办公室、会议、出差、酒店、餐厅、零售、运输、物流、招聘、设施维护、客户服务、活动安排、技术支持、医疗福利、合规、采购、财务等。
5. 所有英语必须自然、准确。
6. 难度按“参考 PDF 校准”要求，以两份参考文件的实际内容为基准，并与 [TARGET_SCORE] 相符；不得为了词汇覆盖任意降低或抬高难度。
7. 正确答案位置要合理均衡，但不得制造机械 ABCD 循环。
8. 错误选项必须合理，但可由原文明确排除。
9. 不要把正确答案泄露在题干、Tags 或格式中。
10. 不输出 TODO、placeholder、"same as above"、"其余略"、省略号代替内容或未完成段落。
11. 不得为了减少输出量而跳过题目或文件。

十一、Markdown 与 Parser

严格遵守 docs/TOEIC-MD-SPEC.md。

包括：
- Heading 层级
- Speaker
- Narrator
- Choice
- Answer / Answers
- Explanation
- Tags
- Passage

文件编码 UTF-8。

不要使用 Parser 不支持的自定义 HTML。

Listening 不创建 MP3/WAV。

Audio 只允许：
- Narrator
- Speaker 1
- Speaker 2
- Speaker 3

不要写：
- pause
- wait
- sleep
- timing
- Next
- page break
- Part 菜单命令

这些由网站代码处理。

十二、Part 1

生成前必须读取 Repository 中除 [TEST_ID] 外所有 public/tests/*/part1.md。

提取并比较：
- 所有历史 A-D 描述
- 正确答案
- Explanation
- 图片路径
- 图片核心观察事实
- 历史六题答案序列

使用项目已有 6 张共享图：
- images/toeic-scenes/office-meeting.svg
- images/toeic-scenes/train-platform.svg
- images/toeic-scenes/restaurant.svg
- images/toeic-scenes/warehouse.svg
- images/toeic-scenes/park.svg
- images/toeic-scenes/construction.svg

每题包含：
- Image
- Audio
- Answer
- Explanation
- Tags

Audio 使用 Speaker 1 朗读 A-D 四个完整描述句。

不要在 Audio 手工加入 Question 1. 等题号，也不要写暂停时间。

新 Part 1 的 24 个描述句必须做到：
- Exact duplicate = 0
- Semantic / core-fact duplicate = 0

不能只替换同义词制造新题。

必须改变真正可观察的事实，例如：
- 人物数量或位置
- 动作
- 物品位置
- 物体排列
- 场所结构
- 状态
- 前景 / 背景关系

A-D 干扰项也必须原创。

目标词只有图片确实支持时才能用于 Part 1，不能为了覆盖词汇虚构图片中不存在的物体或动作。

如果现有 6 张共享图已经无法支持六个与历史题库真正不同且可验证的新正确描述，停止生成 Part 1 并明确报告需要新增共享场景图；不得用重复题凑数。

十三、Part 2

每题 Audio：
- Speaker 1：一个问题或陈述
- Speaker 2：依次朗读 A-C 三个回答

正确回应混合：
- 直接回答
- 间接回答
- 请求回应
- 建议回应
- 时间 / 地点回答
- 委婉拒绝
- 下一步安排

每题必须包含 Answer、Explanation、Tags。

不要写暂停标记。

十四、Part 3

每组使用：
- ## Group N
- ### Questions
- ### Audio
- 3 个 ### Question
- ### Answers
- ### Explanation
- ### Tags

Audio 首行由 Narrator 说明题号范围，之后使用 2～3 位 Speaker 展开自然商务对话。

每组三题混合：
- main idea
- detail
- intention
- inference
- next action

Explanation 下必须分别建立 #### Question N。

Audio 只写 Narrator + conversation transcript，不要复制 Question 和 Options；网站会自动加入问题、选项和答题间隔。

十五、Part 4

结构与 Part 3 相同，但材料为：
- announcement
- telephone message
- advertisement
- news report
- tour information
- workplace talk
- training message
- company update
- travel information
- product information

Audio 首行必须是 Narrator，正文通常由 Speaker 1 连续朗读。

每组 3 题，包含完整 transcript、Answers、逐题 Explanation 和 Tags。

不要在 Audio 中复制 Question 和 Options。

十六、Part 5

每题一个自然句子填空，包含：
- Question
- A-D
- Answer
- Explanation
- Tags
- 可选 Vocabulary

覆盖：
- vocabulary
- collocation
- part of speech
- tense
- voice
- subject-verb agreement
- preposition
- conjunction
- relative clause
- pronoun
- comparison
- business English

目标词较多时，可以让题干、正确选项和干扰选项共同承担自然覆盖，但每题必须只有一个明确最佳答案。

十七、Part 6

创建 4 个 Passage Group，每组 4 题。

材料可以是：
- Email
- Notice
- Article
- Letter
- Memo

题型混合：
- Vocabulary
- Grammar
- Sentence insertion
- Reading comprehension

使用项目规范中的 _____ 与 **[1]**。

每题包含 A-D、Answer、Explanation。

当目标词很多时，可以适度增加 Passage 长度来承载更多词，但必须保持材料自然连贯。

十八、Part 7

使用：
- ## Passage Group N
- ### Type
- ### Passage 1 / 2 / 3
- Questions
- Answers
- Explanations

Type 必须为：
- single
- double
- triple

材料类型多样化，包括：
- Email
- Notice
- Advertisement
- Article
- Chat
- Schedule
- Invoice
- Web Page
- Memo
- Internal announcement
- Customer message
- Company policy
- Event information

需要时使用标准 Markdown table。

double / triple 中必须有一部分问题需要跨两份或三份材料整合信息。

题型覆盖：
- main idea
- detail
- NOT / EXCEPT
- vocabulary in context
- intention
- inference
- information matching
- text insertion

Part 7 是大规模目标词的主要承载区域。词表达到 500 个以上时，可以适当增加 Passage 长度，但不能增加题数，也不能把材料写成目标词堆砌作文。

十九、内容一致性

同一 Group 内的人名、公司名、日期、时间、地点、数量、价格、产品和行程必须前后一致。

Question 必须能从对应 Audio / Passage 找到充分证据。

Explanation 必须说明文本证据、推理、语法或词义依据，不能只写 “The answer is B.”

二十、最终自检

交付前必须执行静态内容检查。

确认文件：
- metadata.md
- part1.md
- part2.md
- part3.md
- part4.md
- part5.md
- part6.md
- part7.md
- vocabulary-coverage.md

确认题数：
- Part 1 = 6
- Part 2 = 25
- Part 3 = 39
- Part 4 = 30
- Part 5 = 30
- Part 6 = 16
- Part 7 = 54
- Listening = 100
- Reading = 100
- Total = 200

确认：
- Question 1～200 连续、唯一
- 所有题有选项
- 所有题有 Answer
- 所有题有 Explanation
- 所有 Listening Group 有 transcript
- 所有 Part 1 有图片
- 所有 Part 3/4 Group 完整
- 所有 Part 6/7 Passage 完整

然后重新扫描最终 part1.md～part7.md，对每一个有效目标词检查真实覆盖。

不得把 Explanation、Tags、metadata 或 vocabulary-coverage.md 中的出现算作正文覆盖。

只要仍有遗漏词，就继续修复正文并重新扫描，不要交付。

最终必须达到：
- Vocabulary coverage: 100%
- Missing vocabulary: 0

二十一、Part 1 历史去重报告

最终报告必须包含：
- 扫描过的已有 Test ID
- 历史 Part 1 描述总数
- 新 Part 1 描述数
- Exact duplicate 数
- Semantic / core-fact duplicate 数
- 六张图片分别采用的新观察重点
- 当前六题答案序列
- 与历史答案序列的比较

必须：
- Exact duplicate = 0
- Semantic duplicate = 0

二十二、交付报告

完成后报告：
1. 实际创建的文件列表
2. TEST_ID
3. Part 1～7 各自题数
4. Listening、Reading、Total
5. Transcript 是否完整
6. Answer 是否完整
7. Explanation 是否完整
8. Part 1 图片是否完整
9. Raw vocabulary entries
10. Invalid entries removed
11. Duplicate entries merged
12. Valid vocabulary items
13. Covered vocabulary items
14. Missing vocabulary items
15. vocabulary-coverage.md 路径
16. 是否逐词验证真实 Part / Question / Group
17. Part 1 历史去重结果
18. 确认没有修改项目代码或配置
19. 确认没有修改 public/tests/index.json
20. 两份参考 PDF 的读取结果、实际参照的 Part 和代表性页码，以及题型、形式、材料长度、难度和干扰项的校准结果
21. 参考内容无法验证的项目（例如缺少听力录音/逐字稿），以及因 Parser 或固定分组要求所作的适配

明确输出：
Vocabulary coverage: 100%
Missing vocabulary: 0

二十三、执行边界

本任务只创建 public/tests/[TEST_ID]/ 中的 Markdown 文件。

不要：
- npm install
- npm run dev
- npm run build
- npm test
- npm run generate:index
- 启动浏览器
- 修改 public/tests/index.json
- 修改项目代码

用户把整个 public/tests/[TEST_ID]/ 文件夹加入 Repository 并推送后，由现有 GitHub Actions 负责后续自动发现、index 生成、测试、构建和 GitHub Pages 发布。

二十四、最重要的执行要求

不要只提供计划。
不要只提供少量示例。
不要询问“是否继续”。
不要因为输出内容很多而主动停止。
不要默默截断词表。
不要只处理前 N 个。
不要随机抽样。
不要把剩余词只写进 Explanation 或 vocabulary-coverage.md 来伪造覆盖。

直接创建完整 9 个 Markdown 文件。

即使 [VOCABULARY_LIST] 包含 500、1000 个或更多有效目标词，也必须完整处理整个词表，并保证全部有效目标词真实存在于 Part 1～7 的考试正文中。
~~~

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
