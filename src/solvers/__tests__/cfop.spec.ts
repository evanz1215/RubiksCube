import { describe, expect, it } from 'vitest'

import { applyMoves, randomScramble, SOLVED } from '@/cube/cube'
import { toFaceMoves } from '@/cube/notation'
import { OLL_ALGS, PLL_ALGS } from '../algs'
import { solveCfop } from '../cfop'
import { F2L_FACELETS } from '../lbl'
import { isSolvedAt } from '../search'

const RUNS = 1000

describe('algorithm tables', () => {
  it('has the complete 57 OLL and 21 PLL cases', () => {
    expect(OLL_ALGS).toHaveLength(57)
    expect(PLL_ALGS).toHaveLength(21)
  })

  it.each([...OLL_ALGS, ...PLL_ALGS])('%s keeps the first two layers intact', (_, alg) => {
    expect(isSolvedAt(applyMoves(SOLVED, toFaceMoves(alg)), F2L_FACELETS)).toBe(true)
  })
})

describe('CFOP', () => {
  it(
    `solves ${RUNS} random scrambles with cross, four F2L pairs, OLL and PLL`,
    () => {
      let fallbacks = 0
      let total = 0
      for (let n = 0; n < RUNS; n++) {
        const state = applyMoves(SOLVED, randomScramble())
        const stages = solveCfop(state)
        const titles = stages.map((s) => s.title)
        expect(titles.slice(0, 5)).toEqual(['十字', 'F2L 第 1 組', 'F2L 第 2 組', 'F2L 第 3 組', 'F2L 第 4 組'])
        if (!titles[titles.length - 1]!.startsWith('PLL')) fallbacks++
        const moves = stages.flatMap((s) => s.moves)
        expect(applyMoves(state, moves)).toBe(SOLVED)
        total += moves.length
      }
      expect(fallbacks).toBe(0)
      expect(total / RUNS).toBeLessThan(75)
    },
    600_000,
  )
})
