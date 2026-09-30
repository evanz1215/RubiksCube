import { CORNERS, EDGES, SOLVED, type CubeState } from './cube'

type Pieces = readonly (readonly number[])[]
interface Candidate {
  piece: number
  orientation: number
}

/**
 * 依魔術方塊規則推算還沒填的格子，只在答案唯一時才填：
 * 1. 某位置扣掉已用掉的方塊後，只剩一種方塊＋朝向能放
 * 2. 某顆還沒出現的方塊，只剩一個位置能放
 * 3. 剩下位置不多時列舉所有放法，用朝向總和與排列奇偶篩到唯一
 * 輸入不合法時不會硬填，交給驗證器報錯。
 */
export function autoComplete(state: CubeState): CubeState {
  const chars = [...state]
  let changed = true
  while (changed) {
    changed =
      fillPieces(chars, CORNERS, permutationParity(chars, EDGES)) ||
      fillPieces(chars, EDGES, permutationParity(chars, CORNERS))
  }
  return chars.join('')
}

const MAX_ENUMERATE = 4

function parityOf(perm: number[]): number {
  let inversions = 0
  perm.forEach((p, i) => perm.slice(i + 1).forEach((q) => (inversions += q < p ? 1 : 0)))
  return inversions % 2
}

/** 另一類方塊全部填好且合法時，回傳其排列奇偶；否則 null */
function permutationParity(chars: string[], pieces: Pieces): number | null {
  const n = pieces[0]!.length
  const targets = pieces.map((p) => p.map((i) => SOLVED[i]).join(''))
  const perm: number[] = []
  for (const stickers of pieces) {
    const colors = stickers.map((i) => chars[i])
    if (colors.includes('.')) return null
    const piece = Array.from({ length: n }, (_, o) => colors.map((_, k) => colors[(o + k) % n]).join(''))
      .map((c) => targets.indexOf(c))
      .find((p) => p !== -1)
    if (piece === undefined) return null
    perm.push(piece)
  }
  return new Set(perm).size === perm.length ? parityOf(perm) : null
}

function fillPieces(chars: string[], pieces: Pieces, otherParity: number | null): boolean {
  const n = pieces[0]!.length
  const targets = pieces.map((p) => p.map((i) => SOLVED[i]!))
  // piece 以 orientation 放在 pos 時，第 k 個顏色落在 stickers[(orientation + k) % n]
  const fits = (pos: number, { piece, orientation }: Candidate) =>
    pieces[pos]!.every((_, k) => {
      const ch = chars[pieces[pos]![(orientation + k) % n]!]
      return ch === '.' || ch === targets[piece]![k]
    })
  const place = (pos: number, { piece, orientation }: Candidate) =>
    pieces[pos]!.forEach((_, k) => (chars[pieces[pos]![(orientation + k) % n]!] = targets[piece]![k]!))

  const all: Candidate[] = targets.flatMap((_, piece) =>
    Array.from({ length: n }, (_, orientation) => ({ piece, orientation })),
  )
  const isKnown = (pos: number) => pieces[pos]!.every((i) => chars[i] !== '.')

  // 已經完整填好的位置：認出是哪一顆、朝向為何
  const known = new Map<number, Candidate>()
  pieces.forEach((_, pos) => {
    if (!isKnown(pos)) return
    const match = all.find((c) => fits(pos, c))
    if (match) known.set(pos, match)
  })
  const used = new Set([...known.values()].map((c) => c.piece))
  const open = pieces.map((_, pos) => pos).filter((pos) => !isKnown(pos))
  const candidates = new Map(open.map((pos) => [pos, all.filter((c) => !used.has(c.piece) && fits(pos, c))]))

  // 規則 1：某位置只剩唯一的方塊＋朝向
  for (const [pos, cands] of candidates) {
    if (cands.length === 1) {
      place(pos, cands[0]!)
      return true
    }
  }

  // 規則 2：某顆方塊只剩一個位置、且朝向唯一
  for (let piece = 0; piece < pieces.length; piece++) {
    if (used.has(piece)) continue
    const spots = open.filter((pos) => candidates.get(pos)!.some((c) => c.piece === piece))
    if (spots.length !== 1) continue
    const options = candidates.get(spots[0]!)!.filter((c) => c.piece === piece)
    if (options.length === 1) {
      place(spots[0]!, options[0]!)
      return true
    }
  }

  // 規則 3：列舉剩下位置的所有放法，保留朝向總和與排列奇偶都合法的
  if (open.length === 0 || open.length > MAX_ENUMERATE || known.size + open.length !== pieces.length) return false
  const solutions: Candidate[][] = []
  const search = (k: number, chosen: Candidate[]) => {
    if (k === open.length) {
      solutions.push([...chosen])
      return
    }
    for (const c of candidates.get(open[k]!)!) {
      if (chosen.some((x) => x.piece === c.piece)) continue
      chosen.push(c)
      search(k + 1, chosen)
      chosen.pop()
    }
  }
  search(0, [])
  const valid = solutions.filter((sol) => {
    const byPos = new Map([...known, ...open.map((pos, k) => [pos, sol[k]!] as const)])
    const all = pieces.map((_, pos) => byPos.get(pos)!)
    const twistOk = all.reduce((sum, c) => sum + c.orientation, 0) % n === 0
    return twistOk && (otherParity === null || parityOf(all.map((c) => c.piece)) === otherParity)
  })
  if (valid.length !== 1) return false
  open.forEach((pos, k) => place(pos, valid[0]![k]!))
  return true
}
