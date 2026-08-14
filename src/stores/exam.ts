import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { ChoiceLabel, TestResult, ToeicTest } from '../types/exam'
import { loadTest } from '../services/testLoader'
import { scoreTest } from '../services/scoring'

const STORAGE_KEY = 'toeic-md-platform-v1'
interface PersistedState { answers: Record<string, Record<number, ChoiceLabel>>; history: TestResult[] }

function readPersisted(): PersistedState {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as PersistedState }
  catch { return { answers: {}, history: [] } }
}

export const useExamStore = defineStore('exam', () => {
  const saved = readPersisted()
  const tests = ref<Record<string, ToeicTest>>({})
  const answers = ref(saved.answers ?? {})
  const history = ref(saved.history ?? [])
  const loading = ref(false)
  const error = ref('')

  watch([answers, history], () => localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: answers.value, history: history.value })), { deep: true })

  async function ensureTest(testId: string) {
    if (tests.value[testId]) return tests.value[testId]
    loading.value = true; error.value = ''
    try { tests.value[testId] = await loadTest(testId); return tests.value[testId] }
    catch (reason) { error.value = reason instanceof Error ? reason.message : 'Invalid TOEIC Markdown format.'; console.error(reason); throw reason }
    finally { loading.value = false }
  }
  function answer(testId: string, questionId: number, choice: ChoiceLabel) { answers.value[testId] ??= {}; answers.value[testId][questionId] = choice }
  function clearAnswers(testId: string) { answers.value[testId] = {} }
  function submit(test: ToeicTest) { const result = scoreTest(test, { ...(answers.value[test.metadata.id] ?? {}) }); history.value.unshift(result); return result }
  const latestResults = computed(() => Object.fromEntries(history.value.map((result) => [result.testId, result])))
  return { tests, answers, history, latestResults, loading, error, ensureTest, answer, clearAnswers, submit }
})
