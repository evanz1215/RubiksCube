import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import { applyMove, applyMoves, SOLVED } from '@/cube/cube'

// jsdom 沒有 WebGL：把 3D 場景換成只記錄呼叫順序的替身
const calls: string[] = []
vi.mock('@/three/cubeScene', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/three/cubeScene')>()),
  createCubeScene: () => ({
    setState: (s: string) => calls.push(`state:${s}`),
    setLabels: () => {},
    setHighlights: () => {},
    animateMove: async (m: string) => {
      calls.push(`turn:${m}`)
    },
    resetView: () => {},
    dispose: () => {},
  }),
}))

const { default: CubeCanvas } = await import('../CubeCanvas.vue')

describe('CubeCanvas', () => {
  beforeEach(() => {
    calls.length = 0
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('plays a double turn as two quarter turns with the halfway state in between', async () => {
    const start = applyMoves(SOLVED, 'R2')
    const wrapper = mount(CubeCanvas, { props: { state: start, duration: 100 } })
    calls.length = 0

    await wrapper.setProps({ state: SOLVED, move: 'R2' })
    await flushPromises()
    expect(calls).toEqual(['turn:R', `state:${applyMove(start, 'R')}`])

    await vi.advanceTimersByTimeAsync(100) // 兩下之間的停頓
    expect(calls).toEqual(['turn:R', `state:${applyMove(start, 'R')}`, 'turn:R', `state:${SOLVED}`])
  })

  it('plays a single turn once', async () => {
    const start = applyMoves(SOLVED, "R'")
    const wrapper = mount(CubeCanvas, { props: { state: start } })
    calls.length = 0
    await wrapper.setProps({ state: SOLVED, move: 'R' })
    await flushPromises()
    expect(calls).toEqual(['turn:R', `state:${SOLVED}`])
  })
})
