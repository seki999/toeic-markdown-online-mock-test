# Practice Visual Learning Specification

Part 1–6 learning illustrations are optional, answer-bearing study aids. They never replace `Image`, enter TTS, affect scoring, or appear in Exam/Review. Practice reveals them after Check answers; an explicit per-set toggle permits earlier viewing with an answer-clue notice. Group images occur once after the question stack, including filtered wrong-answer sets. Single-question images precede their explanation. Missing images produce a readable status, never a decorative substitute.

## Content and ownership

- Part 1: one 2×2 A/B/C/D comparison per question, matching all four descriptions equally, no correctness marks. Keep original real photograph.
- Part 2: one situational illustration per question, integrating prompt, correct response, and contrasting distractions.
- Part 3/4: one coherent scene or sequence per Group, incorporating full transcript and evidence for all three answers.
- Part 5: one diagram per question. Use scene vocabulary diagrams, verb/adverb relations, timelines, passive arrows, relative-clause links, or conjunction/preposition relations as appropriate. Accurate controllable typography is preferred.
- Part 6: one unified process/scene per passage group, including all four completions and their logical relationships.

## Contract

Optional `### Practice Image` and `### Practice Image Alt` sections on independent questions (Parts 1/2/5), or before the first `### Question` on Groups (Parts 3/4/6). Group metadata is never assigned to the final question; the parser also accepts a trailing direct Group field for backward-compatible authoring, but generated fields go before the first question. Paths are public-root-relative, e.g. `images/test-003/practice/part3/group-01.webp`. Reject external URLs, traversal, query strings and unsupported extensions. Original Image remains unchanged.

Model: `Question.practiceImage?/practiceImageAlt?` and `QuestionGroup.practiceImage?/practiceImageAlt?`. A group path is not copied to each question. Wrong-answer filtering preserves group metadata. UI uses a base-aware path resolver, lazy images, natural aspect ratio, captions, friendly failure text, and an accessible zoom dialog with focus return and Escape support. Neither image absence nor load failure blocks answering.

## Workflow and lifecycle

Use `npm run prepare:practice-images -- test-003` to derive 88 records from actual parser output: 6/25/13/10/30/4. Every prompt embeds complete source, all questions/choices, correct answers, and explanations. Records store a source fingerprint; changed content resets approval. Manifest lives at `public/images/<testId>/practice/manifest.json`. IDs and filenames are deterministic across resume. Re-running preparation preserves current work only if its content fingerprint matches.

Generate original scenes with the available image service, one request per asset. Do not substitute text screenshots, flat placeholders, recycled scenes or guessed files. Grammar diagrams may be authored as meaningful SVG with deterministic text and structure. Use `npm run import:practice-image -- <testId> <id> <local-file>` to register a produced asset, then review it visually and semantically before `npm run review:practice-image -- <testId> <id> <review-note>`. Import validates format/dimensions and records provenance; approval is a separate step. Link only approved images via `npm run link:practice-images -- <testId>`.

Statuses: pending, generated, reviewed, approved, failed. Retain error and attempt information for retries. Generation tools/API keys run offline from the frontend; never commit secrets. Record generator or source/license, time, dimensions, byte size, review note and checksum. AI illustrations do not imply photography or endorsement. Keep existing real-photo credits separate.

## Quality and validation

Scene target sizes: Part 1 1536 square; Part 2 1024 square; other Parts 1536×1024. Minimum edge 768; max file size 3 MB. SVG grammar diagrams use an explicit viewBox at this scale and no scripts or external resources. Labels must be readable at mobile width or via zoom. Check every scene against its entire source and all answer evidence; unsupported incidental facts must not become claims. Part 1 letters should be reliably typeset and all panels treated equally.

`npm run validate:practice-images -- test-003` reports expected, generated, approved, missing, pending review, unreferenced images, unsafe paths, duplicate IDs and manifest/reference inconsistencies. Pending work is not completion and returns a nonzero exit status. A separate `--allow-pending` audit reports an incomplete batch without pretending approval. Validate all 200 questions and preserve original content while adding image fields. Required checks: generate:index, test, build, image audit; browser QA covers desktop/mobile, zoom, pre/post-answer behavior, exam isolation and filtered groups.

Operations serialize manifest updates with a short lock and atomic replacement. Record a failed service request using `node scripts/practice-images.mjs fail <testId> <id> "failure reason"`; resume pending/failed entries and retain successful files. A stale content hash or changed approved file blocks linking.

With no test ID, validation discovers every opted-in test manifest automatically (legacy tests without a manifest are unaffected), so CI covers new tests without changing the workflow. Reports rerun the audit before summarizing status.

Test 003 has 67 AI scene illustrations (nine with controlled SVG grammar overlays) and 21 editable SVG grammar diagrams. Raw AI artwork may contain unreviewed labels and is source material only; the nine compiled overlays replace those labels with verified grammar. Raw files and layers are retained outside public in artwork/test-003/practice/part5. Only final compiled approved assets are used by Practice.
