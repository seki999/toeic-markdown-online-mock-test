# TOEIC-MD-SPEC v1.0

本规范是内容生成器与 Parser 的稳定契约。关键词和 heading 大小写建议严格采用示例；空行可以存在，但不要跳过 heading 层级。文件编码必须为 UTF-8。

## 1. Metadata

每套测试包含 `metadata.md`，以 YAML frontmatter 开头。`id`、`title` 必填；`version` 建议为字符串。`demo: true` 允许题量低于官方结构。

```markdown
---
id: test-002
title: TOEIC Mock Test 002
version: "1.0"
difficulty: medium
targetScore: 600-750
listeningQuestions: 100
readingQuestions: 100
demo: false
---
```

ID 必须等于目录的长期身份；发布后不要修改或复用。`index.json` 由 `npm run generate:index` 创建。

## 2. Speaker syntax

Speaker 标签独占一行，下一段非空文本归属于该角色：`Speaker 1:`、`Speaker 2:`、`Speaker 3:`。同一角色的多句可以写在同一段。不得添加 voice 名称、gender 或速率。

## 3. Narrator syntax

`Narrator:` 使用相同语法，通常放在 group Audio 的第一行，朗读题号范围和材料类型。Parser 输出 `{ speaker: "Narrator", text: "..." }`。

## 4. Question syntax

独立题使用 `## Question 101`；group 内使用 `### Question 32`。数字是全套测试中的唯一 ID。题干紧跟 heading，随后是 choices。

## 5. Choice syntax

严格使用 Markdown bullet 与大写字母：

```markdown
- A. First choice
- B. Second choice
- C. Third choice
- D. Fourth choice
```

Part 2 使用 A–C；其他 Part 通常使用 A–D。Part 1/2 的 choices 写在 Audio 中，UI 在 Exam Mode 只显示字母而不显示听力文本。

## 6. Answer syntax

独立题使用 `### Answer` 加一个大写字母。Part 3/4 group 也可用单一 `### Answers` 映射：`32: B`。答案必须存在于 choices 中。

## 7. Explanation syntax

独立题用 `### Explanation`。Group 使用 `### Explanation` 后接 `#### Question 32`。内容允许普通 Markdown、强调和 inline code；raw HTML 不渲染。解析应说明为什么正确，而不是只重复字母。

## 8. Tags

`### Tags` 下使用无序列表。使用短、小写、连字符分隔的稳定术语，例如 `grammar`、`passive-voice`、`logistics`、`inference`。Group tags 会继承到 group 内题目。

## 9. Part 1 format

文件以 `# Part 1` 开头。每题是 level-2 Question，包含 `### Image`、`### Audio`、`### Answer`、`### Explanation`、`### Tags`。Image 是相对于该测试目录的路径。Audio 中 A–D 各写一个 SpeechLine。

## 10. Part 2 format

文件以 `# Part 2` 开头。每题包含 Audio：先写问题，再写 Speaker 2 的 A–C 回答。考试 UI 不显示这些文本，只显示 A/B/C。

## 11. Part 3 format

每个 `## Group N` 表示一段 conversation + 三题：

```markdown
## Group 1
### Questions
32-34
### Audio
Narrator:
Questions 32 through 34 refer to the following conversation.
Speaker 1:
...
Speaker 2:
...
### Question 32
...
### Answers
32: B
33: C
34: B
### Explanation
#### Question 32
...
### Tags
- conversation
```

## 12. Part 4 format

结构与 Part 3 相同，但内容通常是 announcement、advertisement、telephone message 或 talk，主要正文通常由 Speaker 1 单人朗读。每 group 三题。

## 13. Part 5 format

每题独立使用 level-2 Question，题干和 A–D choices 后依次放 Answer、Explanation、可选 Vocabulary、Tags。Vocabulary 是 Markdown 列表，不参与评分。

## 14. Part 6 format

每篇材料使用 `## Passage Group N`。稳定顺序为：`### Type`、`### Passage`、多个 `### Question N`。每题内部包含 choices、`### Answer` 和 `### Explanation`（它们实际是 Question 的直接子 section）。支持三类题：词汇/语法空格写成 `_____`；整句插入点写成 `**[1]**`；阅读理解保持普通问句。

```markdown
## Passage Group 1
### Type
Email
### Passage
Text with _____ and **[1]**.
### Question 131
...
- A. ...
- B. ...
- C. ...
- D. ...
### Answer
B
### Explanation
...
```

## 15. Part 7 format

每组使用 `## Passage Group N`，`### Type` 必须为 `single`、`double` 或 `triple`。每份材料分别使用 `### Passage 1` / 2 / 3，下一行可用 `#### Email`、`#### Notice`、`#### Advertisement`、`#### Article`、`#### Chat`、`#### Schedule`、`#### Invoice`、`#### Web Page` 或 `#### Memo` 标记材料类型。之后放一个或多个 `### Question N`，每题包含 choices、Answer、Explanation。

```markdown
## Passage Group 2
### Type
double
### Passage 1
#### Email
...
### Passage 2
#### Schedule
...
### Question 150
...
### Answer
C
### Explanation
...
```

Double 必须有两份 Passage，Triple 必须有三份；题目可以交叉引用多份材料。表格采用标准 Markdown table。聊天建议用粗体人名/时间加破折号，不使用自定义 HTML。

## Parser error 与发布前检查

以下情况属于结构错误：缺少 Part heading、Question heading 非数字、缺 Answer、Answer 不是 A–D、题目没有足够 choices、Audio 文本没有受支持的 speaker。错误包含源文件行号并在页面显示 `Invalid TOEIC Markdown format.`。

发布前执行：

```bash
npm run generate:index
npm test
npm run build
```

正式题库应为 Part 1–7 分别 6、25、39、30、30、16、54 题，总计 Listening 100 + Reading 100。Demo 可缩短题量，但仍必须满足结构、唯一 ID、答案和 choices 规则。
