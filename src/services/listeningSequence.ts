import type { QuestionGroup, SpeechLine } from '../types/exam'

// These are TOEIC-style simulation intervals, not claimed official timings.
export const LISTENING_INTERVALS = {
  part1AnswerMs: 5_000,
  part2AnswerMs: 5_000,
  part3And4AnswerMs: 8_000,
  partTransitionExtraMs: 3_000,
} as const

function withFinalPause(lines: SpeechLine[], pauseAfterMs: number): SpeechLine[] {
  if (!lines.length) return []
  return lines.map((line, index) => index === lines.length - 1 ? { ...line, pauseAfterMs } : { ...line })
}

function sourceAudio(group: QuestionGroup): SpeechLine[] {
  return group.speech.length ? group.speech : group.questions.flatMap((question) => question.speech)
}

function part3And4Sequence(group: QuestionGroup): SpeechLine[] {
  const material = sourceAudio(group).map((line) => ({ ...line }))
  const questions = group.questions.flatMap((question) => {
    const spokenQuestion: SpeechLine[] = [
      { speaker: 'Narrator', text: question.text },
      ...question.choices.map((choice) => ({
        speaker: 'Narrator' as const,
        text: `${choice.label}. ${choice.text}`,
      })),
    ]
    return withFinalPause(spokenQuestion, LISTENING_INTERVALS.part3And4AnswerMs)
  })
  return [...material, ...questions]
}

export function buildContinuousListeningSequence(groups: QuestionGroup[]): SpeechLine[] {
  return groups.flatMap((group, index) => {
    const nextGroup = groups[index + 1]
    const base = group.part >= 3
      ? part3And4Sequence(group)
      : withFinalPause(
          sourceAudio(group),
          group.part === 1 ? LISTENING_INTERVALS.part1AnswerMs : LISTENING_INTERVALS.part2AnswerMs,
        )

    if (!base.length || !nextGroup || nextGroup.part === group.part) return base

    return base.map((line, lineIndex) => lineIndex === base.length - 1
      ? { ...line, pauseAfterMs: (line.pauseAfterMs ?? 0) + LISTENING_INTERVALS.partTransitionExtraMs }
      : line)
  })
}
