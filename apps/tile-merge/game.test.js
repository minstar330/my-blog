// game.js 단위 테스트
//
// DOM 없이 실행되는 ES 모듈이다. runTests()가 { name, pass, message }[]를 돌려준다.
// 브라우저에서는 test.html이, Node에서는 import('./game.test.js')로 실행할 수 있다.

import {
  WIN_VALUE,
  DIRECTIONS,
  createGame,
  move,
  slideLine,
  spawnTile,
  canMove,
  continueGame,
  fromValues,
  toValues
} from './game.js';

// 정해진 값을 차례로 돌려주는 난수 (끝나면 처음부터 반복)
function sequence(values) {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function show(value) {
  return JSON.stringify(value);
}

// 2.3 표의 경계 사례 (왼쪽 이동 기준)
const EDGE_CASES = [
  { before: [2, 2, 2, 2], after: [4, 4, 0, 0], score: 8, label: '두 쌍이 각각 합쳐짐' },
  { before: [2, 2, 4, 0], after: [4, 4, 0, 0], score: 4, label: '새로 생긴 4는 다시 합쳐지지 않음' },
  { before: [4, 2, 2, 0], after: [4, 4, 0, 0], score: 4, label: '앞쪽 4는 짝이 없음' },
  { before: [2, 2, 2, 0], after: [4, 2, 0, 0], score: 4, label: '앞쪽 두 개가 먼저 합쳐짐' },
  { before: [2, 0, 0, 2], after: [4, 0, 0, 0], score: 4, label: '빈 칸을 건너뛰어 합쳐짐' },
  { before: [8, 4, 4, 8], after: [8, 8, 8, 0], score: 8, label: '가운데 쌍만 합쳐짐' },
  { before: [2, 4, 8, 16], after: [2, 4, 8, 16], score: 0, label: '움직임 없음' },
  { before: [4, 4, 8, 8], after: [8, 16, 0, 0], score: 24, label: '두 쌍 모두 합쳐짐' }
];

const LINE_INDEX = 1;

// 한 줄(앞쪽→뒤쪽 순서 값)을 방향에 맞게 4×4 격자의 LINE_INDEX 줄에 놓는다.
function placeLine(line, direction) {
  const size = line.length;
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  line.forEach((value, k) => {
    if (direction === 'left') grid[LINE_INDEX][k] = value;
    if (direction === 'right') grid[LINE_INDEX][size - 1 - k] = value;
    if (direction === 'up') grid[k][LINE_INDEX] = value;
    if (direction === 'down') grid[size - 1 - k][LINE_INDEX] = value;
  });
  return grid;
}

// 행 우선 첫 빈 칸에 value를 넣은 새 격자 (random이 0이면 첫 빈 칸에 2가 생긴다)
function withSpawnAtFirstEmpty(grid, value) {
  const next = grid.map((row) => row.slice());
  for (let r = 0; r < next.length; r += 1) {
    for (let c = 0; c < next.length; c += 1) {
      if (next[r][c] === 0) {
        next[r][c] = value;
        return next;
      }
    }
  }
  return next;
}

function tests() {
  const list = [];
  const add = (name, fn) => list.push({ name, fn });

  // slideLine: 2.3 표
  EDGE_CASES.forEach(({ before, after, score, label }) => {
    add(`slideLine ${show(before)} → ${show(after)} (${label})`, () => {
      const result = slideLine(before);
      if (!same(result.line, after)) return `줄 결과 ${show(result.line)}`;
      if (result.scoreGained !== score) return `점수 ${result.scoreGained}, 기대 ${score}`;
      return null;
    });
  });

  add('slideLine은 입력 배열을 바꾸지 않는다', () => {
    const input = [2, 2, 4, 0];
    slideLine(input);
    return same(input, [2, 2, 4, 0]) ? null : `입력이 ${show(input)}로 바뀜`;
  });

  // move: 2.3 표 × 네 방향
  DIRECTIONS.forEach((direction) => {
    EDGE_CASES.forEach(({ before, after, score, label }) => {
      add(`move ${direction}: ${show(before)} (${label})`, () => {
        const state = fromValues(placeLine(before, direction), { score: 10 });
        const snapshot = show(toValues(state));
        const result = move(state, direction, sequence([0]));
        if (show(toValues(state)) !== snapshot) return '입력 상태가 바뀜';

        if (score === 0 && same(before, after)) {
          if (result.moved) return 'moved가 true';
          if (result.state !== state) return '같은 참조를 돌려주지 않음';
          if (result.scoreGained !== 0) return '점수가 생김';
          return null;
        }

        const expected = withSpawnAtFirstEmpty(placeLine(after, direction), 2);
        if (!result.moved) return 'moved가 false';
        if (!same(toValues(result.state), expected)) {
          return `결과 ${show(toValues(result.state))}, 기대 ${show(expected)}`;
        }
        if (result.scoreGained !== score) return `얻은 점수 ${result.scoreGained}, 기대 ${score}`;
        if (result.state.score !== 10 + score) return `누적 점수 ${result.state.score}`;
        return null;
      });
    });
  });

  // 타일 정보
  add('move: 합친 타일은 새 id, previous null, mergedFrom에 원래 두 타일', () => {
    const state = fromValues([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    const ids = [state.grid[0][0].id, state.grid[0][1].id];
    const { state: next } = move(state, 'left', sequence([0.99]));
    const merged = next.grid[0][0];
    if (!merged || merged.value !== 4) return '합친 타일 없음';
    if (ids.includes(merged.id)) return '합친 타일 id가 원래 타일과 같음';
    if (merged.previous !== null) return 'previous가 null이 아님';
    if (merged.isNew) return 'isNew가 true';
    if (!merged.mergedFrom || merged.mergedFrom.length !== 2) return 'mergedFrom 없음';
    const fromIds = merged.mergedFrom.map((t) => t.id);
    if (!same(fromIds, ids)) return `mergedFrom id ${show(fromIds)}`;
    const back = merged.mergedFrom[1];
    if (back.row !== 0 || back.col !== 0) return '원래 타일의 이동 후 위치가 목표 칸이 아님';
    if (!same(back.previous, { row: 0, col: 1 })) return '원래 타일의 previous가 틀림';
    return null;
  });

  add('move: 움직인 타일은 id 유지, previous에 이전 위치', () => {
    const state = fromValues([
      [0, 0, 0, 8],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    const id = state.grid[0][3].id;
    const { state: next } = move(state, 'left', sequence([0.99]));
    const tile = next.grid[0][0];
    if (!tile || tile.id !== id) return 'id가 유지되지 않음';
    if (!same(tile.previous, { row: 0, col: 3 })) return `previous ${show(tile.previous)}`;
    if (tile.mergedFrom !== null || tile.isNew) return 'mergedFrom/isNew가 초기화되지 않음';
    return null;
  });

  add('move: 새 타일은 isNew true, nextId로 발급', () => {
    const state = fromValues([
      [0, 0, 0, 8],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    const { state: next } = move(state, 'left', sequence([0]));
    const spawned = next.grid[0][1];
    if (!spawned || !spawned.isNew) return '새 타일이 첫 빈 칸에 없음';
    if (spawned.id !== state.nextId) return `id ${spawned.id}, 기대 ${state.nextId}`;
    if (next.nextId !== state.nextId + 1) return 'nextId가 늘지 않음';
    return null;
  });

  add('move: 이전 턴의 isNew/mergedFrom이 다음 이동에서 초기화된다', () => {
    const state = fromValues([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 8]
    ]);
    const first = move(state, 'left', sequence([0.5]));
    const second = move(first.state, 'up', sequence([0.99]));
    const leftovers = second.state.grid.flat().filter(Boolean)
      .filter((t) => (t.isNew || t.mergedFrom) && t.id < first.state.nextId);
    return leftovers.length === 0 ? null : `남은 표시 ${leftovers.length}개`;
  });

  add('move: 알 수 없는 방향은 무시', () => {
    const state = fromValues([[2, 0], [0, 0]]);
    const result = move(state, 'diagonal', sequence([0]));
    return !result.moved && result.state === state ? null : '상태가 바뀜';
  });

  // 생성 규칙
  add('createGame: 타일 2개, 점수 0, 값은 2 또는 4', () => {
    const state = createGame({ random: sequence([0.3, 0.5, 0.7, 0.95]) });
    const tiles = state.grid.flat().filter(Boolean);
    if (tiles.length !== 2) return `타일 ${tiles.length}개`;
    if (state.score !== 0 || state.won || state.over || state.keepPlaying) return '초기 상태가 틀림';
    if (state.size !== 4) return 'size가 4가 아님';
    if (tiles[0].id === tiles[1].id) return 'id가 겹침';
    if (state.nextId !== 3) return `nextId ${state.nextId}`;
    const values = tiles.map((t) => t.value).sort();
    return same(values, [2, 4]) ? null : `값 ${show(values)}`;
  });

  add('createGame: 난수 순서(칸 → 값)대로 위치가 정해진다', () => {
    // 첫 타일: 16칸 중 floor(0 * 16) = 0 → (0,0), 값 2
    // 둘째 타일: 15칸 중 floor(0.999 * 15) = 14 → (3,3), 값 4
    const state = createGame({ random: sequence([0, 0, 0.999, 0.95]) });
    const values = toValues(state);
    return values[0][0] === 2 && values[3][3] === 4 ? null : show(values);
  });

  add('spawnTile: random < 0.9이면 2', () => {
    const state = fromValues([[0, 0], [0, 0]]);
    const next = spawnTile(state, sequence([0, 0.8999]));
    return next.grid[0][0] && next.grid[0][0].value === 2 ? null : show(toValues(next));
  });

  add('spawnTile: random ≥ 0.9이면 4', () => {
    const state = fromValues([[0, 0], [0, 0]]);
    const next = spawnTile(state, sequence([0, 0.9]));
    return next.grid[0][0] && next.grid[0][0].value === 4 ? null : show(toValues(next));
  });

  add('spawnTile: 빈 칸은 행 우선 순서로 고른다', () => {
    const state = fromValues([[2, 0], [0, 4]]);
    // 빈 칸 [(0,1), (1,0)], floor(0.6 * 2) = 1 → (1,0)
    const next = spawnTile(state, sequence([0.6, 0]));
    return same(toValues(next), [[2, 0], [2, 4]]) ? null : show(toValues(next));
  });

  add('spawnTile: 입력 상태를 바꾸지 않는다', () => {
    const state = fromValues([[0, 0], [0, 0]]);
    spawnTile(state, sequence([0, 0]));
    return same(toValues(state), [[0, 0], [0, 0]]) ? null : '입력 상태가 바뀜';
  });

  add('spawnTile: 빈 칸이 없으면 그대로', () => {
    const state = fromValues([[2, 4], [4, 2]]);
    return spawnTile(state, sequence([0])) === state ? null : '새 상태를 만듦';
  });

  // 움직임 없음
  add('움직임 없음: 새 타일·점수 변화 없음, 같은 참조', () => {
    const state = fromValues([
      [2, 4, 0, 0],
      [8, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ], { score: 40 });
    const result = move(state, 'left', sequence([0]));
    if (result.moved) return 'moved가 true';
    if (result.state !== state) return '다른 참조';
    if (result.scoreGained !== 0 || result.state.score !== 40) return '점수가 바뀜';
    return null;
  });

  // 승리
  add('승리: 2048이 처음 생기면 justWon, won', () => {
    const state = fromValues([
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    const result = move(state, 'left', sequence([0.99]));
    if (!result.justWon) return 'justWon이 false';
    if (!result.state.won) return 'won이 false';
    if (result.state.grid[0][0].value !== WIN_VALUE) return '2048 타일 없음';
    if (result.scoreGained !== 2048) return `점수 ${result.scoreGained}`;
    return null;
  });

  add('승리: 계속하기 전에는 이동을 무시한다', () => {
    const won = move(fromValues([
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]), 'left', sequence([0.99])).state;
    const result = move(won, 'right', sequence([0]));
    return !result.moved && result.state === won ? null : '이동이 일어남';
  });

  add('계속하기: keepPlaying true, 같은 판 진행, 다시 justWon 안 됨', () => {
    // 2048이 이미 있는 판은 fromValues가 won: true로 만든다.
    const won = fromValues([
      [2048, 0, 0, 0],
      [2048, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    if (!won.won || move(won, 'up', sequence([0])).moved) return '계속하기 전에 이동됨';
    const continued = continueGame(won);
    if (!continued.keepPlaying) return 'keepPlaying이 false';
    if (won.keepPlaying) return '입력 상태가 바뀜';
    if (!same(toValues(continued), toValues(won))) return '판이 바뀜';
    const result = move(continued, 'up', sequence([0.99]));
    if (!result.moved) return '계속하기 후 이동이 안 됨';
    if (result.state.grid[0][0].value !== 4096) return `4096 없음: ${show(toValues(result.state))}`;
    if (result.justWon) return '4096에서 다시 justWon';
    if (!result.state.keepPlaying || !result.state.won) return '상태 표시가 사라짐';
    return null;
  });

  // 게임 오버
  add('게임 오버: 새 타일로 꽉 차고 합칠 수 없으면 over', () => {
    const state = fromValues([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [0, 4, 2, 4]
    ]);
    // 왼쪽 이동 → 마지막 줄 [4, 2, 4, ·], 빈 칸 (3,3)에 2 생성
    const result = move(state, 'left', sequence([0, 0]));
    if (!result.moved) return 'moved가 false';
    if (!same(toValues(result.state)[3], [4, 2, 4, 2])) return show(toValues(result.state));
    if (!result.state.over) return 'over가 false';
    if (canMove(result.state)) return 'canMove가 true';
    return null;
  });

  add('게임 오버 아님: 꽉 찼지만 합칠 수 있으면 over 아님', () => {
    const state = fromValues([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [0, 4, 2, 4]
    ]);
    // 빈 칸 (3,3)에 4 생성 → 위의 4와 합칠 수 있음
    const result = move(state, 'left', sequence([0, 0.95]));
    if (!same(toValues(result.state)[3], [4, 2, 4, 4])) return show(toValues(result.state));
    if (result.state.over) return 'over가 true';
    if (!canMove(result.state)) return 'canMove가 false';
    return null;
  });

  add('canMove: 꽉 찼지만 세로로 이웃한 같은 값이 있으면 true', () => {
    const state = fromValues([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 8],
      [4, 2, 4, 8]
    ]);
    return canMove(state) && !state.over ? null : '움직일 수 없다고 판정';
  });

  add('canMove: 빈 칸이 있으면 true, 꽉 차고 이웃 같은 값 없으면 false', () => {
    const open = fromValues([[2, 4], [4, 0]]);
    const stuck = fromValues([[2, 4], [4, 2]]);
    if (!canMove(open)) return '빈 칸이 있는데 false';
    if (canMove(stuck)) return '막혔는데 true';
    if (!stuck.over) return 'fromValues가 over를 표시하지 않음';
    return null;
  });

  add('게임 오버 상태에서는 이동을 무시한다', () => {
    const stuck = fromValues([[2, 4], [4, 2]]);
    const result = move(stuck, 'left', sequence([0]));
    return !result.moved && result.state === stuck ? null : '이동이 일어남';
  });

  add('같은 이동에서 2048 달성과 게임 오버가 함께 일어난다', () => {
    const state = fromValues([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [1024, 1024, 8, 16]
    ]);
    // 왼쪽 이동 → 마지막 줄 [2048, 8, 16, ·], (3,3)에 2 생성 → 위 4와 다름
    const result = move(state, 'left', sequence([0, 0]));
    if (!result.justWon) return 'justWon이 false';
    if (!result.state.over) return `over가 false: ${show(toValues(result.state))}`;
    return null;
  });

  // 자료 변환
  add('fromValues / toValues 왕복', () => {
    const values = [[0, 2, 0, 4], [8, 0, 0, 0], [0, 0, 16, 0], [0, 0, 0, 32]];
    const state = fromValues(values, { score: 12 });
    if (state.score !== 12) return '점수가 반영되지 않음';
    return same(toValues(state), values) ? null : show(toValues(state));
  });

  return list;
}

export function runTests() {
  return tests().map(({ name, fn }) => {
    try {
      const failure = fn();
      return { name, pass: failure === null, message: failure || '' };
    } catch (error) {
      return { name, pass: false, message: `예외: ${error.message}` };
    }
  });
}
