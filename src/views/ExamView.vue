<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadingState from '../components/LoadingState.vue'
import QuestionCard from '../components/QuestionCard.vue'
import TtsControls from '../components/TtsControls.vue'
import { buildContinuousListeningSequence, LISTENING_INTERVALS } from '../services/listeningSequence'
import { getTtsEngine } from '../services/ttsEngine'
import { useExamStore } from '../stores/exam'
import type { ChoiceLabel, QuestionGroup, ToeicTest } from '../types/exam'

const props = defineProps<{ section?: string }>()
const route = useRoute()
const router = useRouter()
const store = useExamStore()
const testId = String(route.params.testId)
const test = ref<ToeicTest>()
const started = ref(false)
const readingPhase = ref(props.section === 'reading')
const readingPosition = ref(0)
const listeningControls = ref<{ play: () => Promise<void> }>()

onMounted(async () => {
  try {
    test.value = await store.ensureTest(testId)
  } catch {
    // Store exposes the parser/loading error through its error state.
  }
})

onBeforeUnmount(() => getTtsEngine().cancelSpeech())

const allGroups = computed<QuestionGroup[]>(() => test.value?.parts.flatMap((part) => part.groups) ?? [])
const listeningGroups = computed(() => allGroups.value.filter((group) => group.part <= 4))
const readingGroups = computed(() => allGroups.value.filter((group) => group.part >= 5))
const listeningQuestions = computed(() => listeningGroups.value.flatMap((group) => group.questions))
const currentReading = computed(() => readingGroups.value[readingPosition.value])
const total = computed(() => test.value?.parts.flatMap((part) => part.groups.flatMap((group) => group.questions)).length ?? 0)
const isListeningPhase = computed(() => started.value && props.section !== 'reading' && !readingPhase.value)
const readingStartNumber = computed(() => listeningQuestions.value.length + readingGroups.value
  .slice(0, readingPosition.value)
  .reduce((count, group) => count + group.questions.length, 0) + 1)
const percent = computed(() => total.value
  ? Math.round((Math.min(isListeningPhase.value ? 1 : readingStartNumber.value, total.value) / total.value) * 100)
  : 0)

const continuousListeningLines = computed(() => buildContinuousListeningSequence(listeningGroups.value))

function choose(id: number, value: ChoiceLabel) {
  store.answer(testId, id, value)
}

async function startTest() {
  started.value = true
  store.clearAnswers(testId)

  if (props.section !== 'reading') {
    await nextTick()
    void listeningControls.value?.play()
  }
}

function continueToReading() {
  getTtsEngine().cancelSpeech()
  readingPhase.value = true
  readingPosition.value = 0
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function nextReading() {
  if (readingPosition.value < readingGroups.value.length - 1) {
    readingPosition.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function previousReading() {
  if (readingPosition.value > 0) readingPosition.value--
}

function submit() {
  if (!test.value) return
  store.submit(test.value)
  getTtsEngine().cancelSpeech()
  router.push(`/test/${testId}/result`)
}
</script>

<template>
  <div class="page">
    <LoadingState :loading="store.loading" :error="store.error" />

    <section v-if="test && !started" class="start-screen">
      <p class="eyebrow">Exam mode</p>
      <h1>Ready when you are.</h1>
      <p class="lead">Press Start test once. Listening Parts 1–4 will then play continuously while all 100 Listening questions remain available from top to bottom.</p>
      <ul>
        <li>{{ total }} original questions in this {{ test.metadata.demo ? 'demonstration' : 'full' }} test</li>
        <li>One click starts continuous Listening playback</li>
        <li>No Next button between Listening questions or sets</li>
        <li>Automatic TOEIC-style answer intervals: {{ LISTENING_INTERVALS.part1AnswerMs / 1000 }} seconds in Parts 1–2 and {{ LISTENING_INTERVALS.part3And4AnswerMs / 1000 }} seconds per question in Parts 3–4</li>
        <li>Reading allows previous/next navigation</li>
        <li>Raw scores only; no unofficial TOEIC conversion</li>
      </ul>
      <button class="button primary large" @click="startTest">Start test</button>
    </section>

    <template v-else-if="test && isListeningPhase">
      <div class="exam-bar">
        <div><span>Listening questions</span><strong>1–{{ listeningQuestions.length }}</strong></div>
        <div class="progress"><i :style="{ width: `${percent}%` }" /></div>
        <span>Continuous</span>
      </div>

      <div class="workspace-header listening-header">
        <div>
          <p class="eyebrow">Listening · Continuous playback</p>
          <h1>Parts 1–4</h1>
          <p class="lead">All {{ listeningQuestions.length }} questions are shown below. Audio plays automatically in question order with built-in answer intervals.</p>
        </div>
        <span class="pill">Exam mode</span>
      </div>

      <TtsControls ref="listeningControls" :lines="continuousListeningLines" exam />

      <div class="continuous-listening">
        <section v-for="group in listeningGroups" :key="group.id" class="listening-set">
          <header class="listening-set-header">
            <p class="eyebrow">Part {{ group.part }}</p>
            <h2>Questions {{ group.questions[0]?.id }}<template v-if="group.questions.length > 1">–{{ group.questions.at(-1)?.id }}</template></h2>
          </header>
          <div class="questions-stack exam-stack">
            <QuestionCard
              v-for="question in group.questions"
              :key="question.id"
              :question="question"
              :model-value="store.answers[testId]?.[question.id]"
              exam
              @update:model-value="choose(question.id, $event)"
            />
          </div>
        </section>
      </div>

      <div class="pager sticky listening-finish">
        <span>End of Listening Parts 1–4</span>
        <button v-if="props.section === 'listening'" class="primary danger" @click="submit">Submit test</button>
        <button v-else class="primary" @click="continueToReading">Continue to Reading →</button>
      </div>
    </template>

    <template v-else-if="test && currentReading">
      <div class="exam-bar">
        <div><span>Question progress</span><strong>{{ readingStartNumber }} / {{ total }}</strong></div>
        <div class="progress"><i :style="{ width: `${percent}%` }" /></div>
        <span>{{ percent }}%</span>
      </div>

      <div class="workspace-header">
        <div><p class="eyebrow">Reading</p><h1>Part {{ currentReading.part }}</h1></div>
        <span class="pill">Exam mode</span>
      </div>

      <section class="questions-stack exam-stack">
        <header v-if="currentReading.part >= 6" class="reading-question-range">
          <p class="eyebrow">Reading set</p>
          <h2>Questions {{ currentReading.questions[0]?.id }}<template v-if="currentReading.questions.length > 1">–{{ currentReading.questions.at(-1)?.id }}</template></h2>
        </header>
        <QuestionCard
          v-for="(question, questionIndex) in currentReading.questions"
          :key="question.id"
          :question="question"
          :model-value="store.answers[testId]?.[question.id]"
          :hide-passages="currentReading.part >= 6 && questionIndex > 0"
          exam
          @update:model-value="choose(question.id, $event)"
        />
      </section>

      <div class="pager sticky">
        <button :disabled="readingPosition === 0" @click="previousReading">← Previous</button>
        <button v-if="readingPosition < readingGroups.length - 1" class="primary" @click="nextReading">Next →</button>
        <button v-else class="primary danger" @click="submit">Submit test</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.continuous-listening {
  display: grid;
  gap: 2rem;
  margin-top: 1.5rem;
}

.listening-set {
  scroll-margin-top: 150px;
}

.listening-set-header,
.reading-question-range {
  padding: 1.25rem 1.5rem;
  background: var(--mint);
  border: 1px solid var(--line);
  border-radius: 18px;
  margin-bottom: 1rem;
}

.listening-set-header .eyebrow,
.reading-question-range .eyebrow {
  margin-bottom: 0.35rem;
}

.listening-set-header h2,
.reading-question-range h2 {
  margin: 0;
  font-size: 1.8rem;
}

.listening-finish {
  align-items: center;
}

.listening-finish span {
  font-weight: 800;
}
</style>
