import { FACES, NORMALS, faceOfNormal, parseMove, rotateVec, splitAlg, type Face } from './cube'

/** 只含六面轉動的標準記號，例如 R、U'、F2 */
export type Move = string

const SUFFIX = ['', '', '2', "'"] as const

// 中層與寬層 = 兩個面轉動 + 整顆翻轉（同軸，可以一起乘上轉動次數）
const EXPAND: Record<string, [string, number][]> = {
  M: [['R', 1], ['L', 3], ['x', 3]],
  E: [['U', 1], ['D', 3], ['y', 3]],
  S: [['F', 3], ['B', 1], ['z', 1]],
  r: [['L', 1], ['x', 1]],
  l: [['R', 1], ['x', 3]],
  u: [['D', 1], ['y', 1]],
  d: [['U', 1], ['y', 3]],
  f: [['B', 1], ['z', 1]],
  b: [['F', 1], ['z', 3]],
}

const ROTATION_AXIS: Record<string, Face> = { x: 'R', y: 'U', z: 'F' }

type FaceMap = Record<Face, Face>

/** 整顆翻轉後，公式裡的面 f 對應到使用者手上（沒翻轉）的哪一面 */
function rotateFaceMap(map: FaceMap, axis: Face, turns: number): FaceMap {
  const inverse = (4 - turns) % 4
  return Object.fromEntries(
    FACES.map((f) => [f, map[faceOfNormal(rotateVec(NORMALS[f], NORMALS[axis], inverse))]]),
  ) as FaceMap
}

/**
 * 把任意記號換算成只有 U R F D L B 的轉動，使用者全程不必換握法；
 * 相鄰的同面轉動會合併（R R → R2、R R' → 消去）。
 */
export function toFaceMoves(alg: string | readonly string[]): Move[] {
  const tokens = typeof alg === 'string' ? splitAlg(alg) : alg
  let map = Object.fromEntries(FACES.map((f) => [f, f])) as FaceMap
  const stack: [Face, number][] = []

  for (const token of tokens) {
    const { base, turns } = parseMove(token)
    for (const [part, times] of EXPAND[base] ?? [[base, 1]]) {
      const k = (times * turns) % 4
      if (k === 0) continue
      const axis = ROTATION_AXIS[part]
      if (axis) {
        map = rotateFaceMap(map, axis, k)
        continue
      }
      const face = map[part as Face]
      const top = stack[stack.length - 1]
      if (top?.[0] === face) {
        top[1] = (top[1] + k) % 4
        if (top[1] === 0) stack.pop()
      } else {
        stack.push([face, k])
      }
    }
  }
  return stack.map(([face, k]) => face + SUFFIX[k])
}

export function invertMoves(moves: readonly Move[]): Move[] {
  return [...moves].reverse().map((m) => {
    const { base, turns } = parseMove(m)
    return base + SUFFIX[(4 - turns) % 4]!
  })
}
