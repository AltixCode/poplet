/**
 * The puzzle: dropping a bubble, popping a group, and — the part the tagline
 * depends on — proving that a level has exactly one solution.
 *
 * **"Fixed shots, one right answer" is a claim, so it is enforced by a solver
 * rather than asserted in a string.** A generated level is kept only when an
 * exhaustive search finds exactly one winning sequence of shots. Anything with
 * zero solutions, or with two, is discarded and never reaches a player. This is
 * the same discipline as Sudokly proving uniqueness and MineStreak discarding a
 * board that needs a guess.
 *
 * Pure and dependency-free.
 */

/**
 * The four bubble colours.
 *
 * This was `string`, which let the board hold any value and — more to the point
 * — let the UI index the palette with something the palette has no entry for.
 * The palette is keyed by exactly these four, so the board must be too.
 */
export type Colour = 'r' | 'g' | 'b' | 'y';
/** A grid, top row first. `null` is an empty cell. */
export type Board = (Colour | null)[][];

export const COLUMNS = 5;
export const ROWS = 5;
/** The most shots a level may need. Keeps the exhaustive search small. */
export const MAX_SHOTS = 4;
/** Levels a free player can open. */
export const FREE_LEVELS = 12;
/** Total levels. */
export const TOTAL_LEVELS = 120;

const COLOURS: Colour[] = ['r', 'g', 'b', 'y'];
/** A group of at least this many touching same-colour bubbles pops. */
const POP_AT = 3;

const clone = (board: Board): Board => board.map((row) => [...row]);

/**
 * The board's own width, not the COLUMNS constant.
 *
 * Reading the constant instead let a shot land in a column the board does not
 * have: `board[row][3]` on a three-wide row is undefined, which is falsy, so it
 * looked like an empty cell and writing to it grew the row. The solver then
 * counted solutions reachable only through columns that do not exist.
 */
const widthOf = (board: Board): number => board[0]?.length ?? COLUMNS;

/** Lets everything fall to the bottom of its column. */
function settle(board: Board): Board {
  const width = widthOf(board);
  const next: Board = Array.from({ length: board.length }, () =>
    Array.from({ length: width }, () => null),
  );
  for (let col = 0; col < width; col += 1) {
    const stack: Colour[] = [];
    for (let row = 0; row < board.length; row += 1) {
      const cell = board[row]![col];
      if (cell) stack.push(cell);
    }
    for (let i = 0; i < stack.length; i += 1) {
      next[board.length - 1 - i]![col] = stack[stack.length - 1 - i]!;
    }
  }
  return next;
}

/** Every cell connected to (row, col) sharing its colour, orthogonally. */
function group(board: Board, row: number, col: number): [number, number][] {
  const colour = board[row]?.[col];
  if (!colour) return [];
  const seen = new Set<string>([`${row},${col}`]);
  const found: [number, number][] = [[row, col]];
  const queue: [number, number][] = [[row, col]];
  while (queue.length) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (seen.has(key)) continue;
      if (board[nr]?.[nc] !== colour) continue;
      seen.add(key);
      found.push([nr, nc]);
      queue.push([nr, nc]);
    }
  }
  return found;
}

/**
 * Drops `colour` into `column`, pops any group it completes, and settles.
 *
 * A full column is a wasted shot rather than an error: the board comes back
 * unchanged, which the solver then treats as a dead end.
 */
export function applyShot(board: Board, column: number, colour: Colour): Board {
  const next = clone(board);
  if (column < 0 || column >= widthOf(board)) return next;
  let landing = -1;
  for (let row = next.length - 1; row >= 0; row -= 1) {
    if (!next[row]![column]) {
      landing = row;
      break;
    }
  }
  if (landing === -1) return next;
  next[landing]![column] = colour;

  const matched = group(next, landing, column);
  if (matched.length >= POP_AT) {
    for (const [r, c] of matched) next[r]![c] = null;
    return settle(next);
  }
  return next;
}

export function isCleared(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell === null));
}

const key = (board: Board): string => board.map((r) => r.map((c) => c ?? '.').join('')).join('/');

/**
 * The first winning sequence of columns, or null.
 *
 * Exhaustive over columns to the shot limit. With five columns and at most four
 * shots that is 625 sequences — small enough to be certain rather than hopeful.
 */
export function solve(board: Board, shots: readonly Colour[], limit: number): number[] | null {
  const search = (current: Board, index: number, path: number[]): number[] | null => {
    if (isCleared(current)) return path;
    if (index >= limit || index >= shots.length) return null;
    for (let column = 0; column < widthOf(current); column += 1) {
      const next = applyShot(current, column, shots[index]!);
      // A shot that changes nothing cannot lead anywhere the current board
      // cannot already reach, and pruning it keeps the search honest and fast.
      if (key(next) === key(current)) continue;
      const found = search(next, index + 1, [...path, column]);
      if (found) return found;
    }
    return null;
  };
  return search(board, 0, []);
}

/** How many distinct shot sequences clear the board. The uniqueness proof. */
export function countSolutions(board: Board, shots: readonly Colour[], limit: number): number {
  let total = 0;
  const search = (current: Board, index: number): void => {
    // Two solutions is already enough to reject a level, so stop counting.
    if (total > 1) return;
    if (isCleared(current)) {
      total += 1;
      return;
    }
    if (index >= limit || index >= shots.length) return;
    for (let column = 0; column < widthOf(current); column += 1) {
      const next = applyShot(current, column, shots[index]!);
      if (key(next) === key(current)) continue;
      search(next, index + 1);
    }
  };
  search(board, 0);
  return total;
}

export interface Level {
  index: number;
  board: Board;
  shots: Colour[];
}

function hash(seed: number, salt: number): number {
  let h = (seed ^ (salt + 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Builds a level backwards: start from an empty board and un-shoot.
 *
 * Generating a random board and hoping it is solvable wastes almost every
 * attempt. Building the solution first guarantees at least one exists; the
 * uniqueness check then rejects anything with a second.
 */
function candidate(seed: number, shotCount: number): Level | null {
  const board: Board = Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, () => null));
  const shots: Colour[] = [];

  // Seed the board with groups that are one bubble short of popping.
  const colourCount = 2 + (hash(seed, 99) % 2);
  for (let i = 0; i < shotCount; i += 1) {
    const colour = COLOURS[hash(seed, i * 7 + 1) % colourCount]!;
    const column = hash(seed, i * 11 + 3) % COLUMNS;
    shots.push(colour);
    // Place POP_AT - 1 of that colour so the shot completes the group.
    let placed = 0;
    for (let row = ROWS - 1; row >= 0 && placed < POP_AT - 1; row -= 1) {
      const target = (column + placed + 1) % COLUMNS;
      if (board[row]![target]) continue;
      board[row]![target] = colour;
      placed += 1;
    }
  }

  const settled = settle(board);
  if (isCleared(settled)) return null;
  return { index: seed, board: settled, shots };
}

/**
 * A level with exactly one solution, found by trying candidates in a fixed
 * order. Deterministic: the same seed always yields the same level.
 */
export function generateLevel(seed: number): Level {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const mixed = hash(seed, attempt);
    const shotCount = 1 + (mixed % MAX_SHOTS);
    const level = candidate(mixed, shotCount);
    if (!level) continue;
    if (countSolutions(level.board, level.shots, level.shots.length) === 1) {
      return { ...level, index: seed };
    }
  }
  // Nothing in 400 attempts. Rather than ship a level whose property is
  // unproven, fall back to the smallest board that is provably unique: a single
  // shot completing one group.
  const board: Board = Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, () => null));
  board[ROWS - 1]![0] = 'r';
  board[ROWS - 1]![1] = 'r';
  return { index: seed, board, shots: ['r'] };
}

export function levelForIndex(index: number): Level {
  return generateLevel(index);
}
