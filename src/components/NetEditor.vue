<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'

import { FACE_COLORS, FACES, type CubeState, type Face } from '@/cube/cube'

const props = withDefaults(
  defineProps<{
    state: CubeState
    highlights: readonly number[]
    /** 依規則自動推算出來的格子（不是使用者親手填的） */
    auto?: readonly number[]
  }>(),
  { auto: () => [] },
)
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

const CELL = 'cell aspect-square min-w-0 rounded-[3px] border border-black/40 p-0 text-[clamp(10px,2.6vw,14px)] leading-none font-semibold'

/** 格子樣式；cell / auto 也是拖曳填色與測試用的語意 class */
function cellClasses(o: { empty: boolean; center: boolean; auto: boolean; marked: boolean; lightText: boolean }) {
  return [
    CELL,
    o.lightText ? 'text-white' : 'text-[#111]',
    o.empty && 'bg-empty',
    o.center && 'outline-2 -outline-offset-3 outline-ink disabled:cursor-default disabled:opacity-100',
    o.auto && ['auto italic outline-2 -outline-offset-5 outline-dashed', o.lightText ? 'outline-white/80' : 'outline-black/65'],
    o.marked && 'z-10 shadow-[0_0_0_3px_var(--color-danger)]',
  ]
}

const cells = computed(() => {
  const marked = new Set(props.highlights)
  const auto = new Set(props.auto)
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
      classes: cellClasses({
        empty: !info,
        center: k === 4,
        auto: auto.has(i),
        marked: marked.has(i),
        lightText: LIGHT_TEXT.has(ch),
      }),
      label: `${FACE_LABEL[face]}面第 ${k + 1} 格：${info ? info.name + '色' : '未填'}${auto.has(i) ? '（自動推算）' : ''}`,
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
  <!-- touch-none：在展開圖上拖曳是填色，不是捲動頁面 -->
  <div
    class="net mx-auto grid w-full max-w-120 touch-none grid-cols-12 gap-0.5 select-none"
    role="group"
    aria-label="展開圖"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
  >
    <button
      v-for="c in cells"
      :key="c.i"
      type="button"
      :class="c.classes"
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
