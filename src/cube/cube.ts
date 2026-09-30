export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const
export type Face = (typeof FACES)[number]

/**
 * 54 字元的貼紙字串，順序 URFDLB（與 Kociemba 相同），每面 9 格由左上到右下。
 * 每格存的是「這個顏色屬於哪一面」的面代號，'.' 代表尚未填色。
 * 握法固定：U=黃、R=橘、F=綠、D=白、L=紅、B=藍。
 */
export type CubeState = string

export const FACE_COLORS: Record<Face, { name: string; letter: string; hex: string }> = {
  U: { name: '黃', letter: 'Y', hex: '#ffd500' },
  R: { name: '橘', letter: 'O', hex: '#ff5800' },
  F: { name: '綠', letter: 'G', hex: '#009e60' },
  D: { name: '白', letter: 'W', hex: '#ffffff' },
  L: { name: '紅', letter: 'R', hex: '#c41e3a' },
  B: { name: '藍', letter: 'B', hex: '#0051ba' },
}

export const SOLVED: CubeState = FACES.map((f) => f.repeat(9)).join('')
export const EMPTY: CubeState = FACES.map((f) => `....${f}....`).join('')
export const CENTERS = [4, 13, 22, 31, 40, 49]

export type Vec = readonly [number, number, number]

// x 朝右 (R)、y 朝上 (U)、z 朝前 (F)
export const NORMALS: Record<Face, Vec> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
}

/** 貼紙所在小方塊的座標（各軸 -1..1），依 Kociemba 展開圖的看法換算 */
function stickerPosition(face: Face, r: number, c: number): Vec {
  switch (face) {
    case 'U':
      return [c - 1, 1, r - 1]
    case 'R':
      return [1, 1 - r, 1 - c]
    case 'F':
      return [c - 1, 1 - r, 1]
    case 'D':
      return [c - 1, -1, 1 - r]
    case 'L':
      return [-1, 1 - r, c - 1]
    case 'B':
      return [1 - c, 1 - r, -1]
  }
}

export interface StickerGeometry {
  face: Face
  pos: Vec
  normal: Vec
}

export const STICKERS: StickerGeometry[] = FACES.flatMap((face) =>
  Array.from({ length: 9 }, (_, i) => ({
    face,
    pos: stickerPosition(face, Math.floor(i / 3), i % 3),
    normal: NORMALS[face],
  })),
)

export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

/** 繞 axis 順時針轉 90°（從 axis 那一面往內看） */
export function rotateVec(v: Vec, axis: Vec, quarterTurns = 1): Vec {
  let out = v
  for (let k = 0; k < quarterTurns; k++) {
    const d = dot(axis, out)
    const c = cross(axis, out)
    out = [axis[0] * d - c[0], axis[1] * d - c[1], axis[2] * d - c[2]]
  }
  return out
}

export function faceOfNormal(n: Vec): Face {
  return FACES.find((f) => dot(NORMALS[f], n) === 1)!
}

const key = (p: Vec, n: Vec) => `${p.join()}|${n.join()}`
const INDEX_OF = new Map(STICKERS.map((s, i) => [key(s.pos, s.normal), i]))

/** 各種轉動：繞哪一面的軸、選哪幾層（以座標在該軸上的投影 d 判斷） */
const LAYERS: Record<string, { axis: Face; select: (d: number) => boolean }> = {
  U: { axis: 'U', select: (d) => d === 1 },
  R: { axis: 'R', select: (d) => d === 1 },
  F: { axis: 'F', select: (d) => d === 1 },
  D: { axis: 'D', select: (d) => d === 1 },
  L: { axis: 'L', select: (d) => d === 1 },
  B: { axis: 'B', select: (d) => d === 1 },
  u: { axis: 'U', select: (d) => d >= 0 },
  r: { axis: 'R', select: (d) => d >= 0 },
  f: { axis: 'F', select: (d) => d >= 0 },
  d: { axis: 'D', select: (d) => d >= 0 },
  l: { axis: 'L', select: (d) => d >= 0 },
  b: { axis: 'B', select: (d) => d >= 0 },
  M: { axis: 'L', select: (d) => d === 0 },
  E: { axis: 'D', select: (d) => d === 0 },
  S: { axis: 'F', select: (d) => d === 0 },
  x: { axis: 'R', select: () => true },
  y: { axis: 'U', select: () => true },
  z: { axis: 'F', select: () => true },
}

const TOKEN = /^([URFDLBurfdlbMESxyz])(w?)(2'?|'?)$/

export interface ParsedMove {
  base: string
  turns: 1 | 2 | 3
}

export function parseMove(token: string): ParsedMove {
  const m = TOKEN.exec(token)
  if (!m) throw new Error(`無法辨識的轉動記號：${token}`)
  const [, letter, wide, suffix] = m as unknown as [string, string, string, string]
  const base = wide ? letter.toLowerCase() : letter
  const turns = suffix === "'" ? 3 : suffix.startsWith('2') ? 2 : 1
  return { base, turns }
}

export const splitAlg = (alg: string) => alg.trim().split(/\s+/).filter(Boolean)

const permCache = new Map<string, number[]>()

/** perm[j] = i 代表轉完後第 j 格的顏色來自原本的第 i 格 */
function permutationOf({ base, turns }: ParsedMove): number[] {
  const cacheKey = base + turns
  const cached = permCache.get(cacheKey)
  if (cached) return cached
  const { axis, select } = LAYERS[base]!
  const axisVec = NORMALS[axis]
  const perm = STICKERS.map((_, i) => i)
  STICKERS.forEach((s, i) => {
    if (!select(dot(s.pos, axisVec))) return
    const j = INDEX_OF.get(key(rotateVec(s.pos, axisVec, turns), rotateVec(s.normal, axisVec, turns)))!
    perm[j] = i
  })
  permCache.set(cacheKey, perm)
  return perm
}

export function applyMove(state: CubeState, token: string): CubeState {
  return permutationOf(parseMove(token))
    .map((i) => state[i])
    .join('')
}

export function applyMoves(state: CubeState, moves: string | readonly string[]): CubeState {
  const list = typeof moves === 'string' ? splitAlg(moves) : moves
  return list.reduce(applyMove, state)
}

// 角塊與邊塊的貼紙位置（Kociemba 定義，第一格為 U/D 面，其餘依順時針）
export const CORNERS = [
  [8, 9, 20], // URF
  [6, 18, 38], // UFL
  [0, 36, 47], // ULB
  [2, 45, 11], // UBR
  [29, 26, 15], // DFR
  [27, 44, 24], // DLF
  [33, 53, 42], // DBL
  [35, 17, 51], // DRB
] as const

export const EDGES = [
  [5, 10], // UR
  [7, 19], // UF
  [3, 37], // UL
  [1, 46], // UB
  [32, 16], // DR
  [28, 25], // DF
  [30, 43], // DL
  [34, 52], // DB
  [23, 12], // FR
  [21, 41], // FL
  [50, 39], // BL
  [48, 14], // BR
] as const

export function randomScramble(length = 25, random = Math.random): string[] {
  const moves: string[] = []
  let last = ''
  while (moves.length < length) {
    const face = FACES[Math.floor(random() * 6)]!
    if (face === last) continue
    last = face
    moves.push(face + ['', "'", '2'][Math.floor(random() * 3)])
  }
  return moves
}
