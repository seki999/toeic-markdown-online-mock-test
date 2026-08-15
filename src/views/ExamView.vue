<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadingState from '../components/LoadingState.vue'
import QuestionCard from '../components/QuestionCard.vue'
import TtsControls from '../components/TtsControls.vue'
import { buildContinuousListeningSequence, LISTENING_INTERVALS } from '../services/listeningSequence'
import { getTtsEngine } from '../services/ttsEngine'
import { useExamStore } from '../stores/exam'
import type { ChoiceLabel, PartNumber, QuestionGroup, SpeechLine, ToeicTest } from '../types/exam'

const props = defineProps<{ section?: string }>()
const route = useRoute()
const router = useRouter()
const store = useExamStore()
const testId = String(route.params.testId)
const test = ref<ToeicTest>()
const started = ref(false)
const activePart = ref<PartNumber>((props.section === 'reading' ? 5 : 1) as PartNumber)
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
const partGroups = computed(() => allGroups.value.filter((group) => group.part === activePart.value))
const partQuestions = computed(() => partGroups.value.flatMap((group) => group.questions))
const total = computed(() => test.value?.parts.flatMap((part) => part.groups.flatMap((group) => group.questions)).length ?? 0)
const startPart = computed(() => props.section === 'reading' ? 5 : 1)
const endPart = computed(() => props.section === 'listening' ? 4 : 7)
const availableParts = computed(() => Array.from(
  { length: endPart.value - startPart.value + 1 },
  (_, index) => startPart.value + index,
))
const firstQuestionNumber = computed(() => partQuestions.value[0]?.id ?? 0)
const lastQuestionNumber = computed(() => partQuestions.value.at(-1)?.id ?? 0)
const percent = computed(() => total.value ? Math.round((firstQuestionNumber.value / total.value) * 100) : 0)

const currentListeningLines = computed<SpeechLine[]>(() => {
  const lines = buildContinuousListeningSequence(partGroups.value)
  if (activePart.value >= 4 || !lines.length) return lines

  return lines.map((line, index) => index === lines.length - 1
    ? { ...line, pauseAfterMs: (line.pauseAfterMs ?? 0) + LISTENING_INTERVALS.partTransitionExtraMs }
    : line)
})

function choose(id: number, value: ChoiceLabel) {
  store.answer(testId, id, value)
}

async function playCurrentListeningPart() {
  if (activePart.value > 4) return
  await nextTick()
  void listeningControls.value?.play()
}

async function startTest() {
  started.value = true
  store.clearAnswers(testId)
  await playCurrentListeningPart()
}

async function handleListeningComplete() {
  if (activePart.value >= 4 || activePart.value >= endPart.value) return
  activePart.value = (activePart.value + 1) as PartNumber
  window.scrollTo({ top: 0, behavior: 'smooth' })
  await playCurrentListeningPart()
}

async function goToPart(part: number) {
  if (part < startPart.value || part > endPart.value) return
  getTtsEngine().cancelSpeech()
  activePart.value = part as PartNumber
  window.scrollTo({ top: 0, behavior: 'smooth' })
  await playCurrentListeningPart()
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
      <p class="lead">Each Part has its own full page. Press Start test once; Listening Parts 1–4 play continuously and change Part pages automatically.</p>
      <ul>
        <li>{{ total }} original questions in this {{ test.metadata.demo ? 'demonstration' : 'full' }} test</li>
        <li>One long page for every Part</li>
        <li>No Next button between Listening questions or sets</li>
        <li>Automatic TOEIC-style answer intervals: {{ LISTENING_INTERVALS.part1AnswerMs / 1000 }} seconds in Parts 1–2 and {{ LISTENING_INTERVALS.part3And4AnswerMs / 1000 }} seconds per question in Parts 3–4</li>
        <li>Reading moves by complete Part pages</li>
        <li>Raw scores only; no unofficial TOEIC conversion</li>
      </ul>
      <button class="button primary large" @click="startTest">Start test</button>
    </section>

    <template v-else-if="test && partGroups.length">
      <div class="exam-bar">
        <div><span>Part {{ activePart }}</span><strong>Questions {{ firstQuestionNumber }}–{{ lastQuestionNumber }}</strong></div>
        <div class="progress"><i :style="{ width: `${percent}%` }" /></div>
        <span>{{ activePart <= 4 ? 'Auto playback' : `${percent}%` }}</span>
      </div>

      <nav class="part-tabs exam-part-menu" aria-label="Choose an exam Part">
        <button
          v-for="number in availableParts"
          :key="number"
          :class="{ active: activePart === number }"
          type="button"
          @click="goToPart(number)"
        >
          Part {{ number }}
          <small>{{ number <= 4 ? 'Listening' : 'Reading' }}</small>
        </button>
      </nav>

      <div class="workspace-header">
        <div>
          <p class="eyebrow">{{ activePart <= 4 ? 'Listening · Continuous playback' : 'Reading' }}</p>
          <h1>Part {{ activePart }}</h1>
          <p class="lead">Questions {{ firstQuestionNumber }}–{{ lastQuestionNumber }} · {{ partQuestions.length }} questions on this page.</p>
        </div>
        <span class="pill">Exam mode</span>
      </div>

      <TtsControls
        v-if="activePart <= 4"
        ref="listeningControls"
        :key="activePart"
        :lines="currentListeningLines"
        exam
        @complete="handleListeningComplete"
      />

      <div class="part-exam-page">
        <section v-for="group in partGroups" :key="group.id" class="exam-question-set">
          <header class="question-set-header">
            <p class="eyebrow">Part {{ activePart }}</p>
            <h2>Questions {{ group.questions[0]?.id }}<template v-if="group.questions.length > 1">–{{ group.questions.at(-1)?.id }}</template></h2>
          </header>

          <div class="questions-stack exam-stack">
            <QuestionCard
              v-for="(question, questionIndex) in group.questions"
              :key="question.id"
              :question="question"
              :model-value="store.answers[testId]?.[question.id]"
              :hide-passages="activePart >= 6 && questionIndex > 0"
              exam
              @update:model-value="choose(question.id, $event)"
            />
          </div>
        </section>
      </div>

      <div v-if="activePart >= 4" class="pager sticky part-navigation">
        <button v-if="activePart > 5 && activePart > startPart" @click="goToPart(activePart - 1)">← Part {{ activePart - 1 }}</button>
        <span v-else>End of Part {{ activePart }}</span>
        <button v-if="activePart < endPart" class="primary" @click="goToPart(activePart + 1)">Continue to Part {{ activePart + 1 }} →</button>
        <button v-else class="primary danger" @click="submit">Submit test</button>
      </div>

      <div v-else class="automatic-part-note">
        Part {{ activePart + 1 }} opens and starts automatically after this Part finishes.
      </div>
    </template>
  </div>
</template>

<style scoped>
.part-exam-page {
  display: grid;
  gap: 2rem;
  margin-top: 1.5rem;
}

.exam-part-menu {
  position: sticky;
  top: 146px;
  z-index: 9;
  padding: 0.75rem;
  margin: 0 0 2rem;
  background: rgba(247, 245, 239, 0.96);
  border: 1px solid var(--line);
  border-radius: 16px;
  backdrop-filter: blur(12px);
}

@media (max-width: 800px) {
  .exam-part-menu {
    top: 126px;
  }
}

.exam-question-set {
  scroll-margin-top: 150px;
}

.question-set-header {
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
  background: var(--mint);
  border: 1px solid var(--line);
  border-radius: 18px;
}

.question-set-header .eyebrow {
  margin-bottom: 0.35rem;
}

.question-set-header h2 {
  margin: 0;
  font-size: 1.8rem;
}

.automatic-part-note {
  margin-top: 2rem;
  padding: 1rem 1.25rem;
  text-align: center;
  font-weight: 800;
  background: var(--mint);
  border-radius: 14px;
}

.part-navigation {
  align-items: center;
}

.part-navigation span {
  font-weight: 800;
}
</style>
