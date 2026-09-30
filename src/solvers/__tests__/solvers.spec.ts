import { beforeAll, describe, expect, it } from 'vitest'

import { applyMoves, CORNERS, randomScramble, SOLVED } from '@/cube/cube'
import { initKociemba, solveKociemba } from '../kociemba'
import { solveAll } from '../index'

const RUNS = 1000

describe('kociemba', () => {
  beforeAll(() => initKociemba())

  it(`solves ${RUNS} random scrambles within 21 moves`, () => {
    for (let n = 0; n < RUNS; n++) {
      const state = applyMoves(SOLVED, randomScramble())
      const moves = solveKociemba(state)
      expect(moves.length).toBeLessThanOrEqual(21)
      expect(applyMoves(state, moves)).toBe(SOLVED)
    }
  })

  it('returns no moves for a solved cube', () => {
    expect(solveKociemba(SOLVED)).toEqual([])
  })

  it('throws on an unsolvable state', () => {
    const chars = [...SOLVED]
    const [a, b, c] = CORNERS[0]
    ;[chars[a], chars[b], chars[c]] = [SOLVED[b]!, SOLVED[c]!, SOLVED[a]!]
    expect(() => solveKociemba(chars.join(''))).toThrow(/Kociemba 求解失敗/)
  })
})

describe('solveAll', () => {
  it('returns verified stages for every method', () => {
    const state = applyMoves(SOLVED, randomScramble())
    for (const r of solveAll(state)) {
      expect(r).toHaveProperty('stages')
    }
  })
})
