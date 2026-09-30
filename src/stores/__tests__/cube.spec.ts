import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { applyMoves, EMPTY, SOLVED } from '@/cube/cube'
import { parseUrlState, useCubeStore } from '../cube'

describe('parseUrlState', () => {
  it('accepts a well-formed state', () => {
    expect(parseUrlState(`?s=${SOLVED}`)).toBe(SOLVED)
    expect(parseUrlState(`?s=${EMPTY}`)).toBe(EMPTY)
  })

  it.each([
    ['missing', ''],
    ['too short', '?s=UUU'],
    ['bad chars', `?s=${SOLVED.replace('R', 'X')}`],
    ['wrong centers', `?s=${applyMoves(SOLVED, 'x')}`],
  ])('rejects %s input', (_, search) => {
    expect(parseUrlState(search)).toBeNull()
  })
})

describe('cube store playback', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/')
    setActivePinia(createPinia())
  })

  function storeWithSolution(moves: string[]) {
    const store = useCubeStore()
    store.state = applyMoves(SOLVED, "F R U")
    store.results = [{ method: 'kociemba', name: 'Kociemba', stages: [{ title: 't', moves }] }]
    store.mode = 'solve'
    store.goTo(0)
    return store
  }

  it('steps forward and back with animatable moves', () => {
    const store = storeWithSolution(['R', "U'", 'F2'])
    store.next()
    expect(store.step).toBe(1)
    expect(store.lastMove).toBe('R')
    store.next()
    store.prev()
    expect(store.step).toBe(1)
    expect(store.lastMove).toBe('U')
    expect(store.displayState).toBe(applyMoves(store.state, ['R']))
  })

  it('clamps jumps and stops at the end', () => {
    const store = storeWithSolution(['R', 'U'])
    store.goTo(99)
    expect(store.step).toBe(2)
    store.next()
    expect(store.step).toBe(2)
  })

  it('ignores painting fixed centers', () => {
    const store = useCubeStore()
    store.color = 'R'
    store.paint(4)
    expect(store.state).toBe(EMPTY)
  })
})
