<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'

import { FACE_COLORS, FACES, type CubeState, type Face } from '@/cube/cube'

const props = defineProps<{ state: CubeState; highlights: readonly number[] }>()
const emit = defineEmits<{ paint: [index: number] }>()

// 十字展開圖中每一面左上角的 [列, 欄]（格子單位）
const FACE_ORIGIN: Record<Face, [number, number]> = {
  U: [0, 3],
  L: [3, 0],
  F: [3, 3],
  R: [3, 6],
  B: [3, 9],
  D: [6, 3],
}
const FACE_LABEL: Record<Face, string> = { U: '上', R: '右', F: '前', D: '下', L: '左', B: '後' }
const LIGHT_TEXT = new Set(['L', 'B'])

const cells = computed(() => {
  const marked = new Set(props.highlights)
  return [...props.state].map((ch, i) => {
    const face = FACES[Math.floor(i / 9)]!
    const k = i % 9
    const [r0, c0] = FACE_ORIGIN[face]
    const info = FACE_COLORS[ch as Face]
    return {
      i,
      row: r0 + Math.floor(k / 3) + 1,
      col: c0 + (k % 3) + 1,
      center: k === 4,
      color: info?.hex,
      letter: info?.letter ?? '',
      lightText: LIGHT_TEXT.has(ch),
      marked: marked.has(i),
      label: `${FACE_LABEL[face]}面第 ${k + 1} 格：${info ? info.name + '色' : '未填'}`,
    }
  })
})

// 按住拖曳連續填色。觸控時事件會一直送到按下的那一格，所以用座標找出手指底下的格子
let painting = false
let lastIndex = -1

function paintAt(x: number, y: number) {
  const cell = document.elementFromPoint(x, y)?.closest<HTMLButtonElement>('.cell')
  if (!cell || cell.disabled) return
  const index = Number(cell.dataset.index)
  if (index === lastIndex) return
  lastIndex = index
  emit('paint', index)
}
function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  painting = true
  lastIndex = -1
  paintAt(e.clientX, e.clientY)
}
function onPointerMove(e: PointerEvent) {
  if (painting) paintAt(e.clientX, e.clientY)
}
const stopPainting = () => (painting = false)

onMounted(() => {
  window.addEventListener('pointerup', stopPainting)
  window.addEventListener('pointercancel', stopPainting)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerup', stopPainting)
  window.removeEventListener('pointercancel', stopPainting)
})
</script>

<template>
  <div class="net" role="group" aria-label="展開圖" @pointerdown="onPointerDown" @pointermove="onPointerMove">
    <button
      v-for="c in cells"
      :key="c.i"
      type="button"
      class="cell"
      :class="{ empty: !c.color, marked: c.marked, center: c.center, 'light-text': c.lightText }"
      :style="{ gridRow: c.row, gridColumn: c.col, background: c.color }"
      :disabled="c.center"
      :aria-label="c.label"
      :data-index="c.i"
      @click="emit('paint', c.i)"
    >
      {{ c.letter }}
    </button>
  </div>
</template>

<style scoped>
.net {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(9, auto);
  gap: 2px;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  touch-action: none; /* 在展開圖上拖曳是填色，不是捲動頁面 */
  user-select: none;
}
.cell {
  aspect-ratio: 1;
  min-width: 0;
  padding: 0;
  border: 1px solid #0006;
  border-radius: 3px;
  font: 600 clamp(10px, 2.6vw, 14px) / 1 system-ui, sans-serif;
  color: #111;
  cursor: pointer;
}
.cell.light-text {
  color: #fff;
}
.cell.empty {
  background: var(--empty);
}
.cell.center {
  cursor: default;
  opacity: 1;
  outline: 2px solid var(--text);
  outline-offset: -3px;
}
.cell.marked {
  box-shadow: 0 0 0 3px var(--danger);
  z-index: 1;
}
</style>
