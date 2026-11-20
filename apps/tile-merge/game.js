// 모아 게임 로직
//
// DOM, localStorage, Math.random을 쓰지 않는 순수 함수만 둔다.
// 모든 함수는 입력 상태를 바꾸지 않고 새 상태를 돌려준다.
// 난수는 () => number (0 이상 1 미만) 형태로 주입받는다.

export const WIN_VALUE = 2048;
export const DIRECTIONS = ['up', 'down', 'left', 'right'];

const NEW_TWO_CHANCE = 0.9;

// 빈 격자(size × size, 모두 null)를 만든다.
function emptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

// 타일 하나를 만든다.
function makeTile(id, value, row, col, extra = {}) {
  return {
    id,
    value,
    row,
    col,
    previous: null,
    mergedFrom: null,
    isNew: false,
    ...extra
  };
}

// 격자의 모든 타일을 행 우선 순서로 돌려준다.
function allTiles(grid) {
  const tiles = [];
  grid.forEach((row) => row.forEach((tile) => {
    if (tile) tiles.push(tile);
  }));
  return tiles;
}

// 빈 칸 좌표 목록 (행 우선: 위→아래, 왼→오른)
function emptyCells(grid) {
  const cells = [];
  grid.forEach((row, r) => row.forEach((tile, c) => {
    if (!tile) cells.push({ row: r, col: c });
  }));
  return cells;
}

// 방향에 맞게 한 줄의 좌표를 "이동 방향 앞쪽"부터 나열한다.
function lineCells(size, direction, index) {
  const cells = [];
  for (let k = 0; k < size; k += 1) {
    if (direction === 'left') cells.push({ row: index, col: k });
    if (direction === 'right') cells.push({ row: index, col: size - 1 - k });
    if (direction === 'up') cells.push({ row: k, col: index });
    if (direction === 'down') cells.push({ row: size - 1 - k, col: index });
  }
  return cells;
}

// 한 줄을 앞쪽(인덱스 0)으로 밀고 합친다. 0은 빈 칸.
export function slideLine(values) {
  const numbers = values.filter((v) => v !== 0);
  const line = [];
  let scoreGained = 0;
  let lastMerged = false;

  numbers.forEach((value) => {
    const last = line.length - 1;
    if (last >= 0 && !lastMerged && line[last] === value) {
      line[last] = value * 2;
      scoreGained += value * 2;
      lastMerged = true;
    } else {
      line.push(value);
      lastMerged = false;
    }
  });

  while (line.length < values.length) line.push(0);
  return { line, scoreGained };
}

// 움직일 수 있는 방향이 하나라도 있는가 (빈 칸 또는 이웃한 같은 값)
export function canMove(state) {
  const { grid, size } = state;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const tile = grid[r][c];
      if (!tile) return true;
      const right = c + 1 < size ? grid[r][c + 1] : null;
      const down = r + 1 < size ? grid[r + 1][c] : null;
      if (right && right.value === tile.value) return true;
      if (down && down.value === tile.value) return true;
    }
  }
  return false;
}

// 빈 칸 하나에 2(90%) 또는 4(10%)를 만든다. 빈 칸이 없으면 그대로 돌려준다.
export function spawnTile(state, random) {
  const empties = emptyCells(state.grid);
  if (empties.length === 0) return state;

  const { row, col } = empties[Math.floor(random() * empties.length)];
  const value = random() < NEW_TWO_CHANCE ? 2 : 4;
  const grid = state.grid.map((cells) => cells.slice());
  grid[row][col] = makeTile(state.nextId, value, row, col, { isNew: true });

  return { ...state, grid, nextId: state.nextId + 1 };
}

// 새 게임: 빈 판에 타일 2개를 만든다.
export function createGame({ size = 4, random }) {
  let state = {
    size,
    grid: emptyGrid(size),
    score: 0,
    won: false,
    keepPlaying: false,
    over: false,
    nextId: 1
  };
  state = spawnTile(state, random);
  state = spawnTile(state, random);
  return state;
}

// 한 줄의 타일을 밀고 합친다. 타일 id·previous·mergedFrom을 채운다.
function moveLine(grid, cells, nextId) {
  const placed = [];
  let id = nextId;
  let scoreGained = 0;
  let moved = false;
  let maxMerged = 0;
  let lastMerged = false;

  cells.forEach(({ row, col }) => {
    const tile = grid[row][col];
    if (!tile) return;

    const last = placed.length - 1;
    if (last >= 0 && !lastMerged && placed[last].value === tile.value) {
      // 앞에 놓인 타일과 합친다.
      const target = cells[last];
      const front = placed[last];
      const back = makeTile(tile.id, tile.value, target.row, target.col, {
        previous: { row, col }
      });
      const value = tile.value * 2;
      placed[last] = makeTile(id, value, target.row, target.col, {
        mergedFrom: [front, back]
      });
      id += 1;
      scoreGained += value;
      maxMerged = Math.max(maxMerged, value);
      moved = true;
      lastMerged = true;
      return;
    }

    const target = cells[placed.length];
    if (target.row !== row || target.col !== col) moved = true;
    placed.push(makeTile(tile.id, tile.value, target.row, target.col, {
      previous: { row, col }
    }));
    lastMerged = false;
  });

  return { placed, nextId: id, scoreGained, moved, maxMerged };
}

// 이동 + (움직였으면) 새 타일 1개 생성 + 승리·게임 오버 판정
export function move(state, direction, random) {
  const unchanged = { state, moved: false, scoreGained: 0, justWon: false };
  if (!DIRECTIONS.includes(direction)) return unchanged;
  if (state.over) return unchanged;
  if (state.won && !state.keepPlaying) return unchanged;

  const { size } = state;
  const grid = emptyGrid(size);
  let nextId = state.nextId;
  let scoreGained = 0;
  let moved = false;
  let maxMerged = 0;

  for (let index = 0; index < size; index += 1) {
    const cells = lineCells(size, direction, index);
    const result = moveLine(state.grid, cells, nextId);
    result.placed.forEach((tile) => {
      grid[tile.row][tile.col] = tile;
    });
    nextId = result.nextId;
    scoreGained += result.scoreGained;
    moved = moved || result.moved;
    maxMerged = Math.max(maxMerged, result.maxMerged);
  }

  if (!moved) return unchanged;

  const reachedWin = maxMerged >= WIN_VALUE;
  const justWon = reachedWin && !state.won && !state.keepPlaying;

  let next = {
    ...state,
    grid,
    nextId,
    score: state.score + scoreGained,
    won: state.won || reachedWin
  };
  next = spawnTile(next, random);
  next = { ...next, over: !canMove(next) };

  return { state: next, moved: true, scoreGained, justWon };
}

// 승리 후 계속하기
export function continueGame(state) {
  return { ...state, keepPlaying: true };
}

// 테스트 편의: 숫자 2차원 배열(0은 빈 칸)로 상태를 만든다.
export function fromValues(values, { score = 0 } = {}) {
  const size = values.length;
  const grid = emptyGrid(size);
  let nextId = 1;
  values.forEach((row, r) => row.forEach((value, c) => {
    if (value !== 0) {
      grid[r][c] = makeTile(nextId, value, r, c);
      nextId += 1;
    }
  }));

  const state = {
    size,
    grid,
    score,
    won: allTiles(grid).some((tile) => tile.value >= WIN_VALUE),
    keepPlaying: false,
    over: false,
    nextId
  };
  return { ...state, over: !canMove(state) };
}

// 상태를 숫자 2차원 배열(0은 빈 칸)로 바꾼다.
export function toValues(state) {
  return state.grid.map((row) => row.map((tile) => (tile ? tile.value : 0)));
}
