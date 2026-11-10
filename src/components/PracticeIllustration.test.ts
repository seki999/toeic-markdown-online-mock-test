// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PracticeIllustration from './PracticeIllustration.vue'
import QuestionCard from './QuestionCard.vue'
import type { Question } from '../types/exam'

const question: Question = { id: 101, part: 5, text: 'Sentence', choices: [{ label: 'A', text: 'One' }, { label: 'B', text: 'Two' }], answer: 'A', explanation: 'An explanation.', tags: [], speech: [], passages: [], practiceImage: 'images/test-003/practice/part5/q101.svg' }
describe('practice illustrations', () => {
  it('renders nothing for absent images and reports failures accessibly', async () => {
    expect(mount(PracticeIllustration).find('figure').exists()).toBe(false)
    const wrapper = mount(PracticeIllustration, { props: { image: question.practiceImage, alt: 'Meaningful description' } })
    expect(wrapper.get('img').attributes('loading')).toBe('lazy')
    await wrapper.get('img').trigger('error')
    expect(wrapper.get('[role="status"]').text()).toContain('unavailable')
    expect(wrapper.find('img').exists()).toBe(false)
    await wrapper.setProps({ image: 'images/test-003/practice/part5/q102.svg' })
    expect(wrapper.find('img').exists()).toBe(true)
  })
  it('opens and closes a native keyboard-accessible modal and restores focus', async () => {
    const show = vi.fn(), close = vi.fn()
    HTMLDialogElement.prototype.showModal = show
    HTMLDialogElement.prototype.close = close
    const wrapper = mount(PracticeIllustration, { props: { image: question.practiceImage }, attachTo: document.body })
    await wrapper.get('button').trigger('click')
    expect(show).toHaveBeenCalledOnce()
    await wrapper.get('dialog button').trigger('click')
    expect(close).toHaveBeenCalled()
    await wrapper.get('dialog').trigger('close')
    expect(document.activeElement).toBe(wrapper.get('button').element)
    wrapper.unmount()
  })
  it('requires an explicit practice opt-in, regardless of revealing answers', () => {
    expect(mount(QuestionCard, { props: { question, reveal: true } }).findComponent(PracticeIllustration).exists()).toBe(false)
    expect(mount(QuestionCard, { props: { question, showPracticeImage: true } }).findComponent(PracticeIllustration).exists()).toBe(true)
    expect(mount(QuestionCard, { props: { question, exam: true, reveal: true, showPracticeImage: true } }).findComponent(PracticeIllustration).exists()).toBe(false)
  })
})
