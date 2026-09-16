import {
  COLUMNS,
  FREE_LEVELS,
  MAX_SHOTS,
  applyShot,
  countSolutions,
  generateLevel,
  isCleared,
  levelForIndex,
  solve,
  type Board,
  type Colour,
} from '../puzzle';

// `Colour` is now the four codes rather than any string, so the fixture helper
// takes them too -- a test board that could hold 'purple' was a test board the
// palette could not colour.
const board = (rows: (Colour | null)[][]): Board => rows.map((r) => [...r]);

describe('shooting', () => {
  it('drops a bubble to the lowest free cell in its column', () => {
    const b = board([
      [null, null, null],
      [null, null, null],
      ['r', null, null],
    ]);
    const next = applyShot(b, 0, 'g');
    expect(next[1]![0]).toBe('g');
    expect(next[2]![0]).toBe('r');
  });

  it('leaves a full column untouched', () => {
    const b = board([['r'], ['r'], ['r']]);
    // 'r' would make four in a column; the column is full so nothing lands.
    expect(applyShot(b, 0, 'g')).toEqual(b);
  });

  it('pops a group of three or more of the same colour', () => {
    const b = board([
      [null, null, null],
      ['r', null, null],
      ['r', 'g', 'g'],
    ]);
    const next = applyShot(b, 0, 'r');
    expect(next[2]![0]).toBeNull();
    expect(next[1]![0]).toBeNull();
  });

  it('does not pop a pair', () => {
    const b = board([
      [null, null],
      ['r', 'g'],
    ]);
    const next = applyShot(b, 0, 'r');
    expect(next[0]![0]).toBe('r');
  });

  it('lets bubbles above a popped group fall', () => {
    // The green sits on top of a red in column 1. Completing the red row
    // horizontally pops all three, and the green then has nothing under it.
    const b = board([
      [null, null, null],
      [null, 'g', null],
      ['r', 'r', null],
    ]);
    const next = applyShot(b, 2, 'r');
    expect(next[2]![1]).toBe('g');
    expect(next[2]![0]).toBeNull();
  });
});

describe('clearing', () => {
  it('knows an empty board is cleared', () => {
    expect(isCleared(board([[null, null], [null, null]]))).toBe(true);
  });

  it('knows a board with anything left is not', () => {
    expect(isCleared(board([[null, null], ['r', null]]))).toBe(false);
  });
});

describe('the solver', () => {
  it('finds a solution when one exists', () => {
    const b = board([
      [null, null, null],
      [null, null, null],
      ['r', 'r', null],
    ]);
    const solution = solve(b, ['r'], 1);
    expect(solution).not.toBeNull();
    expect(solution).toHaveLength(1);
  });

  it('returns null when no sequence of shots can clear it', () => {
    const b = board([
      [null, null, null],
      [null, null, null],
      ['r', 'g', null],
    ]);
    expect(solve(b, ['b'], 1)).toBeNull();
  });

  it('counts every distinct solution, which is what "one right answer" means', () => {
    // The two reds are NOT adjacent, so only the middle column joins them into
    // a group of three. Shooting either outer column lands on top of a single
    // red and makes a pair, which does not pop.
    //
    // An adjacent pair would have three solutions, not one: the landing bubble
    // connects transitively through the pair whichever column it arrives in.
    const b = board([
      [null, null, null],
      [null, null, null],
      ['r', null, 'r'],
    ]);
    expect(countSolutions(b, ['r'], 1)).toBe(1);
  });
});

describe('generated levels', () => {
  it('produces a level with exactly one solution', () => {
    for (let seed = 0; seed < 25; seed += 1) {
      const level = generateLevel(seed);
      expect(countSolutions(level.board, level.shots, level.shots.length)).toBe(1);
    }
  });

  it('is deterministic for a seed, so a level is the same for everyone', () => {
    expect(generateLevel(7)).toEqual(generateLevel(7));
  });

  it('never exceeds the shot budget', () => {
    for (let seed = 0; seed < 25; seed += 1) {
      expect(generateLevel(seed).shots.length).toBeLessThanOrEqual(MAX_SHOTS);
      expect(generateLevel(seed).shots.length).toBeGreaterThan(0);
    }
  });

  it('fits the board width', () => {
    for (let seed = 0; seed < 10; seed += 1) {
      for (const row of generateLevel(seed).board) {
        expect(row).toHaveLength(COLUMNS);
      }
    }
  });

  it('gives the same level for the same index, however it is reached', () => {
    expect(levelForIndex(12)).toEqual(levelForIndex(12));
  });
});

describe('what is free', () => {
  it('opens the first levels and gates the rest', () => {
    expect(FREE_LEVELS).toBeGreaterThan(0);
  });
});
