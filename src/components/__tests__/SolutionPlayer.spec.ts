import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import { applyMoves, SOLVED } from '@/cube/cube'
import { useCubeStore } from '@/stores/cube'
import { DOUBLE_TURN_PAUSE, moveAnimationMs } from '@/three/cubeScene'
import SolutionPlayer from '../SolutionPlayer.vue'

describe('SolutionPlayer', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/')
    setActivePinia(createPinia())
  })

  it('marks double turns so they are not mistaken for a single turn', async () => {
    const store = useCubeStore()
    store.state = applyMoves(SOLVED, "U' R2")
    store.results = [{ method: 'kociemba', name: 'Kociemba', stages: [{ title: 't', moves: ['R2', 'U'] }] }]
    store.mode = 'solve'
    const wrapper = mount(SolutionPlayer)
    await wrapper.get('[data-testid="start"]').trigger('click')

    expect(wrapper.get('[data-testid="next-move"]').text()).toBe('R2')
    expect(wrapper.find('[data-testid="double-hint"]').text()).toBe('轉兩次')

    await wrapper.get('[data-testid="next-step"]').trigger('click')
    expect(wrapper.get('[data-testid="next-move"]').text()).toBe('U')
    expect(wrapper.find('[data-testid="double-hint"]').exists()).toBe(false)
  })

  it('shows a start button instead of 下一步 until the user starts', async () => {
    const store = useCubeStore()
    store.state = applyMoves(SOLVED, "U' R'")
    store.results = [
      { method: 'kociemba', name: 'Kociemba', stages: [{ title: 't', moves: ['R', 'U'] }] },
      { method: 'lbl', name: '層先法', stages: [{ title: 't', moves: ['R', 'U'] }] },
    ]
    store.mode = 'solve'
    store.selectMethod('kociemba')
    const wrapper = mount(SolutionPlayer)
    const cls = (id: string) => wrapper.get(`[data-testid="${id}"]`).classes()

    // 還沒開始：只有「開始」，沒有下一步，也沒有任何步驟被標示
    expect(wrapper.find('[data-testid="next-step"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="next-move"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ready"]').exists()).toBe(true)
    expect(cls('move-0')).not.toContain('next')
    expect(cls('move-0')).not.toContain('current')

    await wrapper.get('[data-testid="start"]').trigger('click')
    expect(store.step).toBe(0)
    expect(wrapper.get('[data-testid="next-move"]').text()).toBe('R')
    expect(cls('move-0')).toContain('next')

    await wrapper.get('[data-testid="next-step"]').trigger('click')
    expect(cls('move-0')).toContain('current')
    expect(cls('move-1')).toContain('next')

    // 換解法會回到「還沒開始」
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
    expect(wrapper.find('[data-testid="start"]').exists()).toBe(true)
    expect(store.step).toBe(0)
  })

  it('gives double turns two quarter-turn animations plus a pause', () => {
    expect(moveAnimationMs('R', 350)).toBe(350)
    expect(moveAnimationMs("R'", 350)).toBe(350)
    expect(moveAnimationMs('R2', 350)).toBe(350 * (2 + DOUBLE_TURN_PAUSE))
  })
})
