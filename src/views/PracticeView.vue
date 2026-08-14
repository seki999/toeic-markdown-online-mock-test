<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import LoadingState from '../components/LoadingState.vue'
import QuestionCard from '../components/QuestionCard.vue'
import TtsControls from '../components/TtsControls.vue'
import { getTtsEngine } from '../services/ttsEngine'
import { useExamStore } from '../stores/exam'
import type { ChoiceLabel, PartNumber, QuestionGroup, ToeicTest } from '../types/exam'

const route = useRoute()
const store = useExamStore()
const testId = String(route.params.testId)
const test = ref<ToeicTest>()
const part = ref<PartNumber>(Number(route.query.part || 1) as PartNumber)
const revealedGroups = ref<Record<string, boolean>>({})
const visibleTranscripts = ref<Record<string, boolean>>({})

onMounted(async () => {
  try {
    test.value = await store.ensureTest(testId)
  } catch {
    // Store exposes the parser/loading error through its error state.
  }
})

onBeforeUnmount(() => getTtsEngine().cancelSpeech())

watch(part, () => {
  revealedGroups.value = {}
  visibleTranscripts.value = {}
  getTtsEngine().cancelSpeech()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

const wrongOnly = computed(() => route.query.wrong === '1')
const groups = computed<QuestionGroup[]>(() => {
  const source = test.value?.parts.find((item) => item.number === part.value)?.groups ?? []
  if (!wrongOnly.value) return source

  const wrong = new Set(store.latestResults[testId]?.wrongQuestions ?? [])
  return source
    .map((group) => ({ ...group, questions: group.questions.filter((question) => wrong.has(question.id)) }))
    .filter((group) => group.questions.length)
})
const questionCount = computed(() => groups.value.reduce((total, group) => total + group.questions.length, 0))

function choose(questionId: number, value: ChoiceLabel) {
  store.answer(testId, questionId, value)
}

function audioLines(group: QuestionGroup) {
  return group.speech.length ? group.speech : group.questions.flatMap((question) => question.speech)
}

function groupAnswered(group: QuestionGroup) {
  return group.questions.every((question) => Boolean(store.answers[testId]?.[question.id]))
}
</script>

<template>
  <div class="page">
    <LoadingState :loading="store.loading" :error="store.error" />

    <template v-if="test">
      <div class="workspace-header">
        <div>
          <p class="eyebrow">{{ wrongOnly ? 'Wrong answer practice' : 'Practice mode' }}</p>
          <h1>Part {{ part }}</h1>
          <p class="lead part-summary">{{ questionCount }} questions · Complete this Part from top to bottom.</p>
        </div>
        <RouterLink class="button quiet" :to="`/test/${testId}`">Exit practice</RouterLink>
      </div>

      <div class="part-tabs" role="tablist" aria-label="Choose a TOEIC Part">
        <button
          v-for="number in 7"
          :key="number"
          :class="{ active: part === number }"
          type="button"
          @click="part = number as PartNumber"
        >
          Part {{ number }}
          <small>{{ number < 5 ? 'Listening' : 'Reading' }}</small>
        </button>
      </div>

      <div v-if="groups.length" class="full-part-practice">
        <section v-for="(group, groupIndex) in groups" :key="group.id" class="practice-set">
          <header class="set-toolbar">
            <div>
              <p class="eyebrow">Set {{ groupIndex + 1 }} of {{ groups.length }}</p>
              <h2>Questions {{ group.questions[0]?.id }}<template v-if="group.questions.length > 1">–{{ group.questions.at(-1)?.id }}</template></h2>
            </div>

            <div class="set-actions">
              <TtsControls v-if="audioLines(group).length" :lines="audioLines(group)" />
              <button
                v-if="audioLines(group).length"
                type="button"
                @click="visibleTranscripts[group.id] = !visibleTranscripts[group.id]"
              >
                {{ visibleTranscripts[group.id] ? 'Hide' : 'Show' }} transcript
              </button>
              <button
                class="primary"
                type="button"
                :disabled="!groupAnswered(group)"
                @click="revealedGroups[group.id] = true"
              >
                Check answers
              </button>
            </div>
          </header>

          <div class="questions-stack">
            <QuestionCard
              v-for="(question, questionIndex) in group.questions"
              :key="question.id"
              :question="question"
              :model-value="store.answers[testId]?.[question.id]"
              :reveal="Boolean(revealedGroups[group.id])"
              :show-transcript="Boolean(visibleTranscripts[group.id]) && questionIndex === 0"
              @update:model-value="choose(question.id, $event)"
            />
          </div>
        </section>
      </div>

      <div v-else class="empty-state">
        <h2>No questions here yet</h2>
        <p>{{ wrongOnly ? 'Complete an exam to build your wrong-answer list.' : 'This Part has no content.' }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.part-summary {
  margin: 0.7rem 0 0;
  font-size: 1rem;
}

.full-part-practice {
  display: grid;
  gap: 2rem;
}

.practice-set {
  scroll-margin-top: 100px;
}

.set-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1.25rem;
  background: var(--mint);
  border: 1px solid var(--line);
  border-radius: 18px;
}

.set-toolbar h2 {
  margin: 0;
  font-size: 1.7rem;
}

.set-toolbar .eyebrow {
  margin-bottom: 0.4rem;
}

.set-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.set-actions :deep(.tts-controls) {
  margin: 0;
  padding: 0.45rem;
}

@media (max-width: 800px) {
  .set-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .set-actions {
    justify-content: flex-start;
  }
}
</style>
