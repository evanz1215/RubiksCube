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

    expect(wrapper.get('[data-testid="next-move"]').text()).toBe('R2')
    expect(wrapper.find('[data-testid="double-hint"]').text()).toBe('轉兩次')

    await wrapper.get('[data-testid="next-step"]').trigger('click')
    expect(wrapper.get('[data-testid="next-move"]').text()).toBe('U')
    expect(wrapper.find('[data-testid="double-hint"]').exists()).toBe(false)
  })

  it('gives double turns two quarter-turn animations plus a pause', () => {
    expect(moveAnimationMs('R', 350)).toBe(350)
    expect(moveAnimationMs("R'", 350)).toBe(350)
    expect(moveAnimationMs('R2', 350)).toBe(350 * (2 + DOUBLE_TURN_PAUSE))
  })
})
