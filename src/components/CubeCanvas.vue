<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { applyMove, type CubeState } from '@/cube/cube'
import { createCubeScene, type CubeScene } from '@/three/cubeScene'

const props = withDefaults(
  defineProps<{
    state: CubeState
    highlights?: readonly number[]
    labels?: boolean
    /** 若新狀態 = 舊狀態套用這個轉動，就播放動畫；否則直接切換 */
    move?: string | null
    duration?: number
    /** 數值改變時重設視角 */
    resetKey?: number
  }>(),
  { highlights: () => [], labels: false, move: null, duration: 350, resetKey: 0 },
)

const emit = defineEmits<{ stickerClick: [index: number] }>()

const host = ref<HTMLDivElement>()
let scene: CubeScene | undefined
let queue = Promise.resolve()

onMounted(() => {
  scene = createCubeScene(host.value!, (i) => emit('stickerClick', i))
  scene.setState(props.state)
  scene.setLabels(props.labels)
  scene.setHighlights(props.highlights)
})

onBeforeUnmount(() => scene?.dispose())

// 動畫依序排隊播放，快速連點也不會錯亂
watch(
  () => props.state,
  (next, prev) => {
    const move = props.move
    const duration = props.duration
    queue = queue.then(async () => {
      if (!scene) return
      if (move && applyMove(prev, move) === next) await scene.animateMove(move, duration)
      scene.setState(next)
    })
  },
)
watch(() => props.labels, (v) => scene?.setLabels(v))
watch(() => props.highlights, (v) => scene?.setHighlights(v))
watch(() => props.resetKey, () => scene?.resetView())
</script>

<template>
  <div ref="host" class="cube-canvas" data-testid="cube-canvas" />
</template>

<style scoped>
.cube-canvas {
  width: 100%;
  height: 100%;
  min-height: 240px;
  touch-action: none;
}
.cube-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
