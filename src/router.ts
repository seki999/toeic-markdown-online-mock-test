import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import IntroView from './views/IntroView.vue'
import PracticeView from './views/PracticeView.vue'
import ExamView from './views/ExamView.vue'
import ResultView from './views/ResultView.vue'
import ReviewView from './views/ReviewView.vue'
import SettingsView from './views/SettingsView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: HomeView },
    { path: '/tests', component: HomeView },
    { path: '/test/:testId', component: IntroView },
    { path: '/test/:testId/practice', component: PracticeView },
    { path: '/test/:testId/exam', component: ExamView },
    { path: '/test/:testId/listening', component: ExamView, props: { section: 'listening' } },
    { path: '/test/:testId/reading', component: ExamView, props: { section: 'reading' } },
    { path: '/test/:testId/result', component: ResultView },
    { path: '/test/:testId/review', component: ReviewView },
    { path: '/settings', component: SettingsView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
