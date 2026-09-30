import { describe, expect, it } from 'vitest'

import {
  applyMoves,
  CENTERS,
  CORNERS,
  dot,
  EDGES,
  randomScramble,
  SOLVED,
  STICKERS,
  type CubeState,
  type Vec,
} from '../cube'
import { invertMoves, toFaceMoves } from '../notation'

const posOf = (i: number) => STICKERS[i]!.pos.join()
const normalOf = (i: number) => STICKERS[i]!.normal

/** 三個法向量的繞向（+1 / -1） */
const winding = ([a, b, c]: readonly number[]) => {
  const [p, q, r] = [normalOf(a!), normalOf(b!), normalOf(c!)]
  const cross: Vec = [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]
  return dot(cross, r)
}

/** 整顆轉到中心塊回到 URFDLB 的方向（只看顏色，不管握法） */
function reorient(state: CubeState): CubeState {
  for (const a of ['', 'x', 'x2', "x'", 'z', "z'"]) {
    for (const b of ['', 'y', 'y2', "y'"]) {
      const s = applyMoves(state, `${a} ${b}`)
      if (CENTERS.map((i) => s[i]).join('') === 'URFDLB') return s
    }
  }
  throw new Error('unreachable')
}

describe('cube moves', () => {
  it('matches known Kociemba facelet strings', () => {
    expect(applyMoves(SOLVED, 'R')).toBe('UUFUUFUUFRRRRRRRRRFFDFFDFFDDDBDDBDDBLLLLLLLLLUBBUBBUBB')
    expect(applyMoves(SOLVED, 'U')).toBe('UUUUUUUUUBBBRRRRRRRRRFFFFFFDDDDDDDDDFFFLLLLLLLLLBBBBBB')
  })

  it.each(['U', 'R', 'F', 'D', 'L', 'B', 'M', 'E', 'S', 'x', 'y', 'z', 'r', 'Rw'])(
    '%s four times is identity',
    (m) => {
      expect(applyMoves(SOLVED, [m, m, m, m])).toBe(SOLVED)
    },
  )

  it('scramble followed by its inverse is identity', () => {
    for (let n = 0; n < 50; n++) {
      const s = randomScramble()
      expect(applyMoves(applyMoves(SOLVED, s), invertMoves(s))).toBe(SOLVED)
    }
  })

  it('never produces consecutive same-face moves in a scramble', () => {
    const s = randomScramble(100)
    s.slice(1).forEach((m, i) => expect(m[0]).not.toBe(s[i]![0]))
  })

  it('piece tables group stickers of one cubie with consistent winding', () => {
    for (const c of CORNERS) {
      expect(new Set(c.map(posOf)).size).toBe(1)
      expect(winding(c)).toBe(winding(CORNERS[0]))
    }
    for (const e of EDGES) expect(new Set(e.map(posOf)).size).toBe(1)
    expect(new Set([...CORNERS.flat(), ...EDGES.flat(), ...CENTERS]).size).toBe(54)
  })
})

describe('toFaceMoves', () => {
  it('merges and cancels adjacent same-face moves', () => {
    expect(toFaceMoves('R R')).toEqual(['R2'])
    expect(toFaceMoves("R R'")).toEqual([])
    expect(toFaceMoves("R U U' R")).toEqual(['R2'])
  })

  it('remaps faces after rotations', () => {
    expect(toFaceMoves('y R')).toEqual(['B'])
    expect(toFaceMoves('x U')).toEqual(['F'])
    expect(toFaceMoves('z U')).toEqual(['L'])
  })

  it.each([
    "y R U R' U'",
    'M2 U M2 U2 M2 U M2',
    "r U R' U' r' F R F'",
    "x R' U R' D2 R U' R' D2 R2 x'",
    "F R U R' U' F' f R U R' U' f'",
    "E S' z y' Lw2 d b' u2 l",
  ])('keeps the cube state identical for %s', (alg) => {
    const start = applyMoves(SOLVED, randomScramble())
    expect(applyMoves(start, toFaceMoves(alg))).toBe(reorient(applyMoves(start, alg)))
  })

  it('outputs only face moves', () => {
    for (const m of toFaceMoves("M E S x y z r u f l d b R2' Uw'")) {
      expect(m).toMatch(/^[URFDLB](2|')?$/)
    }
  })
})
