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
 * 輸入一致時推算必定正確；推算結果若出現矛盾，代表使用者填錯，
 * 此時放棄推算、原樣回傳，讓驗證器直接指出填錯的方塊。
 */
export function autoComplete(state: CubeState): CubeState {
  const chars = [...state]
  let changed = true
  while (changed) {
    changed =
      fillPieces(chars, CORNERS, permutationParity(chars, EDGES)) ||
      fillPieces(chars, EDGES, permutationParity(chars, CORNERS))
  }
  return hasConflict(chars) ? state : chars.join('')
}

/** 某色超過 9 格，或已填滿的位置出現不存在／重複的方塊 */
function hasConflict(chars: string[]): boolean {
  const counts = new Map<string, number>()
  for (const ch of chars) if (ch !== '.') counts.set(ch, (counts.get(ch) ?? 0) + 1)
  if ([...counts.values()].some((n) => n > 9)) return true
  return [CORNERS, EDGES].some((pieces) => {
    const found = pieces.map((_, pos) => pieceAt(chars, pieces, pos)).filter((p) => p !== null)
    return found.includes(-1) || new Set(found).size !== found.length
  })
}

/** pos 上是哪一顆方塊：未填滿為 null，不存在的顏色組合為 -1 */
function pieceAt(chars: string[], pieces: Pieces, pos: number): number | null {
  const stickers = pieces[pos]!
  const n = stickers.length
  const colors = stickers.map((i) => chars[i])
  if (colors.includes('.')) return null
  const targets = pieces.map((p) => p.map((i) => SOLVED[i]).join(''))
  for (let o = 0; o < n; o++) {
    const piece = targets.indexOf(colors.map((_, k) => colors[(o + k) % n]).join(''))
    if (piece !== -1) return piece
  }
  return -1
}

const MAX_ENUMERATE = 4

function parityOf(perm: number[]): number {
  let inversions = 0
  perm.forEach((p, i) => perm.slice(i + 1).forEach((q) => (inversions += q < p ? 1 : 0)))
  return inversions % 2
}

/** 另一類方塊全部填好且合法時，回傳其排列奇偶；否則 null */
function permutationParity(chars: string[], pieces: Pieces): number | null {
  const perm = pieces.map((_, pos) => pieceAt(chars, pieces, pos))
  if (perm.some((p) => p === null || p === -1)) return null
  const valid = perm as number[]
  return new Set(valid).size === valid.length ? parityOf(valid) : null
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
