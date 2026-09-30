<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { applyMove, parseMove, type CubeState } from '@/cube/cube'
import { createCubeScene, DOUBLE_TURN_PAUSE, type CubeScene } from '@/three/cubeScene'

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 雙轉拆成兩下 90°，中間停一下，使用者才看得出要轉兩次 */
async function animate(s: CubeScene, from: CubeState, move: string, duration: number) {
  const { base, turns } = parseMove(move)
  if (turns !== 2) return s.animateMove(move, duration)
  await s.animateMove(base, duration)
  s.setState(applyMove(from, base))
  await sleep(duration * DOUBLE_TURN_PAUSE)
  await s.animateMove(base, duration)
}

// 動畫依序排隊播放，快速連點也不會錯亂
watch(
  () => props.state,
  (next, prev) => {
    const move = props.move
    const duration = props.duration
    queue = queue.then(async () => {
      if (!scene) return
      if (move && applyMove(prev, move) === next) await animate(scene, prev, move, duration)
      scene.setState(next)
    })
  },
)
watch(() => props.labels, (v) => scene?.setLabels(v))
watch(() => props.highlights, (v) => scene?.setHighlights(v))
watch(() => props.resetKey, () => scene?.resetView())
</script>

<template>
  <!-- 高度由使用端以 class 指定；canvas 填滿容器，尺寸交給 CSS -->
  <div ref="host" class="w-full min-h-60 touch-none *:block *:size-full" data-testid="cube-canvas" />
</template>
