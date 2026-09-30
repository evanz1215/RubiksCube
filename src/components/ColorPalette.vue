<script setup lang="ts">
import { FACE_COLORS, FACES, type Face } from '@/cube/cube'

defineProps<{ counts: Record<Face, number> }>()
const selected = defineModel<Face>({ required: true })
</script>

<template>
  <div class="palette" role="radiogroup" aria-label="選擇顏色">
    <button
      v-for="f in FACES"
      :key="f"
      type="button"
      role="radio"
      class="swatch"
      :class="{ selected: selected === f, over: counts[f] > 9 }"
      :aria-checked="selected === f"
      :aria-label="`${FACE_COLORS[f].name}色，已填 ${counts[f]} 格`"
      :data-color="f"
      :style="{ '--swatch': FACE_COLORS[f].hex }"
      @click="selected = f"
    >
      <span class="chip">{{ FACE_COLORS[f].letter }}</span>
      <span class="count">{{ counts[f] }}/9</span>
    </button>
  </div>
</template>

<style scoped>
.palette {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0;
  border: 2px solid transparent;
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
.swatch.selected {
  border-color: var(--accent);
}
.chip {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #0005;
  background: var(--swatch);
  color: #111;
  font-weight: 700;
}
.count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.over .count {
  color: var(--danger);
  font-weight: 700;
}
</style>
