// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PracticeView from './PracticeView.vue'
import PracticeIllustration from '../components/PracticeIllustration.vue'
import { useExamStore } from '../stores/exam'
import { loadTest } from '../services/testLoader'
vi.mock('../services/ttsEngine', () => ({ getTtsEngine: () => ({ cancelSpeech: vi.fn() }) }))
vi.mock('../services/testLoader', async importOriginal => ({ ...await importOriginal<typeof import('../services/testLoader')>(), loadTest: vi.fn() }))
import type { Question, ToeicTest } from '../types/exam'

const questions = [32, 33, 34].map(id => ({ id, part: 3, text: 'What is planned?', choices: [{ label: 'A', text: 'A meeting' }, { label: 'B', text: 'A meal' }], answer: 'A', explanation: 'They will meet.', tags: [], speech: [], passages: [] } as Question))
const test: ToeicTest = { metadata: { id: 'test-visual', title: 'Visual', version: '1', demo: true }, parts: [{ number: 3, title: 'Part 3', groups: [{ id: '3-group-1', part: 3, questions, speech: [], passages: [], tags: [], practiceImage: 'images/test-visual/practice/group-01.webp' }] }] }

beforeEach(() => { localStorage.clear(); window.scrollTo = vi.fn(); HTMLDialogElement.prototype.close = vi.fn(); HTMLDialogElement.prototype.showModal = vi.fn() })
async function setup(wrong = false) {
  const pinia = createPinia(); setActivePinia(pinia)
  const store = useExamStore()
  vi.mocked(loadTest).mockResolvedValue(test)
  if (wrong) store.history = [{ id: 'r', testId: 'test-visual', date: '', answers: { 34: 'B' }, partScores: [], listening: { correct: 0, total: 1 }, reading: { correct: 0, total: 0 }, total: { correct: 0, total: 1 }, accuracy: 0, wrongQuestions: [34], unansweredQuestions: [] }]
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/test/:testId/practice', component: PracticeView }, { path: '/test/:testId', component: { template: '<div />' } }] })
  await router.push(`/test/test-visual/practice?part=3${wrong ? '&wrong=1' : ''}`); await router.isReady()
  const wrapper = mount(PracticeView, { global: { plugins: [pinia, router], stubs: { TtsControls: true } } })
  await flushPromises()
  return wrapper
}
describe('Practice illustration state', () => {
  it('shows exactly one group image after checking and permits explicit early reveal/hide', async () => {
    const wrapper = await setup()
    expect(wrapper.findAll('.question-card')).toHaveLength(3)
    expect(wrapper.findAllComponents(PracticeIllustration).filter(w => w.find('figure').exists())).toHaveLength(0)
    const toggle = () => wrapper.findAll('button').find(b => /learning illustrations/.test(b.text()))!
    await toggle().trigger('click')
    expect(wrapper.findAll('.practice-illustration')).toHaveLength(1)
    await toggle().trigger('click')
    expect(wrapper.findAll('.practice-illustration')).toHaveLength(0)
    wrapper.unmount()
    const checked = await setup()
    await checked.findAll('button').find(b => b.text() === 'Check answers')!.trigger('click')
    expect(checked.findAll('.practice-illustration')).toHaveLength(1)
    expect(checked.findAll('details')).toHaveLength(3)
    checked.unmount()
  })
  it('preserves the shared image when only the final wrong question remains', async () => {
    const wrapper = await setup(true)
    expect(wrapper.findAll('.question-card')).toHaveLength(1)
    await wrapper.findAll('button').find(b => b.text() === 'Check answers')!.trigger('click')
    expect(wrapper.findAll('.practice-illustration')).toHaveLength(1)
    expect(wrapper.text()).toContain('Question 34 · Explanation')
    wrapper.unmount()
  })
})
