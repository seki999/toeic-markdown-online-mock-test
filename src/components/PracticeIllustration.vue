<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { practiceImageUrl } from '../services/practiceImages'

const props = defineProps<{ image?: string; alt?: string; caption?: string }>()
const source = computed(() => props.image ? practiceImageUrl(props.image) : undefined)
const failed = ref(false)
const zoom = ref<HTMLDialogElement>()
const trigger = ref<HTMLButtonElement>()
watch(() => props.image, () => { failed.value = false; zoom.value?.close() })
async function enlarge() { await nextTick(); zoom.value?.showModal() }
function close() { zoom.value?.close() }
function restoreFocus() { trigger.value?.focus() }
onBeforeUnmount(() => zoom.value?.close())
</script>

<template>
  <figure v-if="image" class="practice-illustration">
    <figcaption>{{ caption || 'Learning illustration · Contains answer clues' }}</figcaption>
    <p v-if="failed || !source" role="status">The learning illustration is unavailable. You can continue using the written explanation.</p>
    <template v-else>
      <button ref="trigger" type="button" class="image-button" aria-label="Enlarge learning illustration" @click="enlarge">
        <img :src="source" :alt="alt || 'Illustration explaining this practice set'" loading="lazy" decoding="async" @error="failed = true">
        <span>Enlarge image</span>
      </button>
      <dialog ref="zoom" aria-label="Enlarged learning illustration" @close="restoreFocus" @click="($event.target === zoom) && close()">
        <button type="button" autofocus @click="close">Close image</button>
        <img :src="source" :alt="alt || 'Enlarged practice illustration'" @error="failed = true; close()">
        <p>{{ caption || 'Learning illustration' }}</p>
      </dialog>
    </template>
  </figure>
</template>

<style scoped>
.practice-illustration { margin: 1.25rem 0; padding: 1rem; border: 1px solid var(--line); border-radius: 16px; background: var(--mint); }
figcaption { margin-bottom: .75rem; font-weight: 650; }
.image-button { display: block; width: 100%; padding: .5rem; background: transparent; border: 0; border-radius: 12px; box-shadow: none; }
.image-button:focus-visible { outline: 3px solid #2c5c57; outline-offset: 3px; }
img { display: block; max-width: 100%; height: auto; margin: auto; border-radius: 8px; }
.image-button img { max-height: 680px; object-fit: contain; }
.image-button span { display: inline-block; margin-top: .6rem; }
dialog { width: min(96vw, 1600px); max-height: 94dvh; overflow: auto; border: 1px solid var(--line); border-radius: 16px; padding: 1rem; }
dialog::backdrop { background: #102b32cc; }
dialog button { position: sticky; top: 0; right: 0; z-index: 1; display: block; margin: 0 0 .75rem auto; }
dialog img { max-width: none; width: max(100%, 900px); }
@media (max-width: 600px) { .practice-illustration { padding: .5rem; } dialog { width: 96vw; padding: .5rem; } }
</style>
