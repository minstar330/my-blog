// editor.js · png.js · palette.js 단위 테스트
//
// DOM 없이 실행되는 ES 모듈이다. runTests()가 { name, pass, message }[]를 돌려준다.
// 브라우저에서는 test.html이, Node에서는 import('./editor.test.js')로 실행할 수 있다.

import {
  SIZE,
  HISTORY_LIMIT,
  createPixels,
  inBounds,
  getPixel,
  isBlank,
  samePixels,
  normalizeHex,
  lineCells,
  paintCells,
  floodFill,
  pickColor,
  createHistory,
  commit,
  canUndo,
  canRedo,
  undo,
  redo,
  serializeDrawing,
  parseDrawing,
  parseSettings,
  defaultSettings
} from './editor.js';
import { SCALES, DEFAULT_SCALE, hexToRgb, toRgba, makeFileName } from './png.js';
import { PALETTE, DEFAULT_COLOR, colorName, describeColor } from './palette.js';

const RED = '#e0393e';
const BLUE = '#2f5fd0';
const GREEN = '#2e9e5b';

function show(value) {
  return JSON.stringify(value);
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// 문자 지도('.'=빈 칸, 'r'·'b'·'g'=색)로 작은 그림을 만든다.
const LETTERS = { '.': null, r: RED, b: BLUE, g: GREEN };

function fromMap(rows) {
  return rows.join('').split('').map((ch) => LETTERS[ch]);
}

function toMap(pixels, size) {
  const reverse = new Map(Object.entries(LETTERS).map(([k, v]) => [v, k]));
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    rows.push(pixels.slice(y * size, (y + 1) * size).map((c) => reverse.get(c) || '?').join(''));
  }
  return rows;
}

// 획 하나(여러 칸)를 칠하고 이력에 남기는 과정을 흉내 낸다.
function stroke(state, cells, color) {
  const before = state.pixels;
  let pixels = before;
  cells.forEach((cell) => {
    pixels = paintCells(pixels, [cell], color);
  });
  return { pixels, history: commit(state.history, before, pixels) };
}

function tests() {
  const list = [];
  const add = (name, fn) => list.push({ name, fn });

  // ---------- 기본 ----------
  add('createPixels: 16×16 모두 빈 칸', () => {
    const pixels = createPixels();
    if (pixels.length !== 256) return `길이 ${pixels.length}`;
    return isBlank(pixels) ? null : '빈 칸이 아님';
  });

  add('inBounds / getPixel: 범위 밖은 false·null', () => {
    if (inBounds(-1, 0) || inBounds(0, 16) || inBounds(16, 0)) return '범위 밖을 true로 봄';
    if (!inBounds(0, 0) || !inBounds(15, 15)) return '범위 안을 false로 봄';
    const pixels = paintCells(createPixels(), [{ x: 3, y: 2 }], RED);
    if (getPixel(pixels, 3, 2) !== RED) return '칠한 칸을 못 읽음';
    if (getPixel(pixels, 20, 2) !== null) return '범위 밖이 null이 아님';
    return pixels[2 * SIZE + 3] === RED ? null : '인덱스가 y * size + x가 아님';
  });

  add('samePixels: 값 비교', () => {
    const a = createPixels(4);
    const b = createPixels(4);
    if (!samePixels(a, b)) return '같은 값인데 false';
    b[5] = RED;
    return samePixels(a, b) ? '다른 값인데 true' : null;
  });

  add('normalizeHex: 여러 형식', () => {
    const cases = [
      ['#ABC', '#aabbcc'],
      ['#aabbcc', '#aabbcc'],
      ['AABBCC', '#aabbcc'],
      ['  #12AB34 ', '#12ab34'],
      ['#abcd', null],
      ['red', null],
      ['#ggg', null],
      ['', null],
      [null, null],
      [123, null]
    ];
    const wrong = cases.filter(([input, expected]) => normalizeHex(input) !== expected);
    return wrong.length === 0 ? null : `틀림: ${show(wrong)}`;
  });

  // ---------- 보간 ----------
  add('lineCells: 같은 점이면 [start]', () => {
    const cells = lineCells(4, 5, 4, 5);
    return sameJson(cells, [{ x: 4, y: 5 }]) ? null : show(cells);
  });

  add('lineCells: 가로·세로 직선 양 끝 포함', () => {
    const h = lineCells(1, 2, 5, 2);
    const v = lineCells(3, 6, 3, 2);
    if (h.length !== 5 || h[0].x !== 1 || h[4].x !== 5 || h.some((c) => c.y !== 2)) return `가로 ${show(h)}`;
    if (v.length !== 5 || v[0].y !== 6 || v[4].y !== 2 || v.some((c) => c.x !== 3)) return `세로 ${show(v)}`;
    return null;
  });

  add('lineCells: 대각선 0,0 → 15,15는 16칸, 시작 → 끝 순서', () => {
    const cells = lineCells(0, 0, 15, 15);
    if (cells.length !== 16) return `칸 수 ${cells.length}`;
    const ok = cells.every((c, i) => c.x === i && c.y === i);
    return ok ? null : show(cells);
  });

  add('lineCells: 완만한 기울기도 칸이 끊기지 않음', () => {
    const pairs = [[0, 0, 15, 4], [15, 3, 0, 9], [2, 14, 6, 0], [10, 1, 1, 12]];
    for (const [x0, y0, x1, y1] of pairs) {
      const cells = lineCells(x0, y0, x1, y1);
      const first = cells[0];
      const last = cells[cells.length - 1];
      if (first.x !== x0 || first.y !== y0 || last.x !== x1 || last.y !== y1) return `끝점 틀림 ${show([x0, y0, x1, y1])}`;
      const expected = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1;
      if (cells.length !== expected) return `칸 수 ${cells.length}, 기대 ${expected}`;
      for (let i = 1; i < cells.length; i += 1) {
        const step = Math.max(Math.abs(cells[i].x - cells[i - 1].x), Math.abs(cells[i].y - cells[i - 1].y));
        if (step !== 1) return `건너뜀 ${show(cells[i - 1])} → ${show(cells[i])}`;
      }
    }
    return null;
  });

  // ---------- 칠하기 ----------
  add('paintCells: 범위 밖 칸은 건너뛰고 입력은 그대로', () => {
    const pixels = createPixels();
    const next = paintCells(pixels, [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 16, y: 3 }], RED);
    if (!isBlank(pixels)) return '입력이 바뀜';
    if (next[0] !== RED) return '칠해지지 않음';
    return next.filter((c) => c !== null).length === 1 ? null : '범위 밖 칸이 칠해짐';
  });

  add('paintCells: 바뀐 게 없으면 같은 참조', () => {
    const pixels = paintCells(createPixels(), [{ x: 1, y: 1 }], RED);
    if (paintCells(pixels, [{ x: 1, y: 1 }], RED) !== pixels) return '같은 색인데 새 배열';
    if (paintCells(pixels, [{ x: 30, y: 30 }], RED) !== pixels) return '범위 밖인데 새 배열';
    const blank = createPixels();
    return paintCells(blank, [{ x: 0, y: 0 }], null) === blank ? null : '빈 칸 지우기인데 새 배열';
  });

  add('paintCells: 지우개(color = null)', () => {
    const pixels = paintCells(createPixels(), [{ x: 2, y: 2 }], RED);
    const erased = paintCells(pixels, [{ x: 2, y: 2 }], null);
    return isBlank(erased) ? null : '지워지지 않음';
  });

  // ---------- 채우기 ----------
  add('floodFill: 벽(경계) 안쪽만 채움', () => {
    const pixels = fromMap([
      'rrrrr',
      'r...r',
      'r...r',
      'rrrrr',
      '.....'
    ]);
    const next = floodFill(pixels, 2, 1, BLUE, 5);
    const expected = ['rrrrr', 'rbbbr', 'rbbbr', 'rrrrr', '.....'];
    return sameJson(toMap(next, 5), expected) ? null : show(toMap(next, 5));
  });

  add('floodFill: 대각선으로만 닿은 칸은 안 바뀜(4방향)', () => {
    const pixels = fromMap([
      'r.',
      '.r'
    ]);
    const next = floodFill(pixels, 0, 0, BLUE, 2);
    const expected = ['b.', '.r'];
    return sameJson(toMap(next, 2), expected) ? null : show(toMap(next, 2));
  });

  add('floodFill: 빈 칸 영역도 채움', () => {
    const pixels = fromMap([
      '..r',
      '..r',
      'rrr'
    ]);
    const next = floodFill(pixels, 0, 0, GREEN, 3);
    const expected = ['ggr', 'ggr', 'rrr'];
    return sameJson(toMap(next, 3), expected) ? null : show(toMap(next, 3));
  });

  add('floodFill: 같은 색이면 같은 참조, 입력은 그대로', () => {
    const pixels = fromMap(['rr', 'r.']);
    if (floodFill(pixels, 0, 0, RED, 2) !== pixels) return '같은 색인데 새 배열';
    const blank = createPixels();
    if (floodFill(blank, 3, 3, null) !== blank) return '빈 칸에 빈 칸 채우기인데 새 배열';
    if (floodFill(pixels, 5, 5, BLUE, 2) !== pixels) return '범위 밖인데 새 배열';
    floodFill(pixels, 0, 0, BLUE, 2);
    return sameJson(toMap(pixels, 2), ['rr', 'r.']) ? null : '입력이 바뀜';
  });

  add('floodFill: 16×16 빈 그림 전체 채우기(스택)', () => {
    const next = floodFill(createPixels(), 7, 7, RED);
    return next.every((c) => c === RED) ? null : '다 채워지지 않음';
  });

  add('pickColor: 색 칸·빈 칸', () => {
    const pixels = paintCells(createPixels(), [{ x: 4, y: 4 }], BLUE);
    if (pickColor(pixels, 4, 4) !== BLUE) return '색을 못 집음';
    return pickColor(pixels, 0, 0) === null ? null : '빈 칸이 null이 아님';
  });

  // ---------- 이력 ----------
  add('commit: 바뀌지 않으면 같은 참조', () => {
    const history = createHistory();
    const pixels = createPixels();
    if (commit(history, pixels, pixels) !== history) return '같은 참조인데 기록됨';
    return commit(history, pixels, createPixels()) === history ? null : '값이 같은데 기록됨';
  });

  add('되돌리기/다시 하기: 한 획 = 한 단계', () => {
    let state = { pixels: createPixels(), history: createHistory() };
    state = stroke(state, lineCells(0, 0, 5, 0), RED);
    if (state.history.past.length !== 1) return `획 1개에 단계 ${state.history.past.length}`;
    const afterStroke = state.pixels;
    const undone = undo(state.history, state.pixels);
    if (!isBlank(undone.pixels)) return '되돌린 뒤 빈 그림이 아님';
    if (!canRedo(undone.history) || canUndo(undone.history)) return '되돌린 뒤 버튼 상태가 틀림';
    const redone = redo(undone.history, undone.pixels);
    if (!samePixels(redone.pixels, afterStroke)) return '다시 하기 결과가 다름';
    return canRedo(redone.history) ? '다시 한 뒤에도 다시 하기 가능' : null;
  });

  add('되돌리기: 할 게 없으면 null', () => {
    const history = createHistory();
    if (undo(history, createPixels()) !== null) return 'undo가 null이 아님';
    return redo(history, createPixels()) === null ? null : 'redo가 null이 아님';
  });

  add('새 동작을 하면 다시 하기 목록을 비움', () => {
    let state = { pixels: createPixels(), history: createHistory() };
    state = stroke(state, [{ x: 0, y: 0 }], RED);
    state = stroke(state, [{ x: 1, y: 0 }], RED);
    const undone = undo(state.history, state.pixels);
    state = { pixels: undone.pixels, history: undone.history };
    if (!canRedo(state.history)) return '되돌린 뒤 다시 하기 불가';
    state = stroke(state, [{ x: 5, y: 5 }], BLUE);
    return canRedo(state.history) ? '새 동작 뒤에도 다시 하기 가능' : null;
  });

  add(`이력 한도 ${HISTORY_LIMIT}단계: 가장 오래된 것부터 버림`, () => {
    let state = { pixels: createPixels(), history: createHistory() };
    for (let i = 0; i < 60; i += 1) {
      state = stroke(state, [{ x: i % SIZE, y: Math.floor(i / SIZE) }], RED);
    }
    if (state.history.past.length !== HISTORY_LIMIT) return `past 길이 ${state.history.past.length}`;
    let count = 0;
    let current = state;
    for (;;) {
      const result = undo(current.history, current.pixels);
      if (result === null) break;
      current = result;
      count += 1;
    }
    if (count !== HISTORY_LIMIT) return `되돌린 횟수 ${count}`;
    // 60획 중 50단계를 되돌리면 앞의 10획이 남아 있어야 한다.
    const painted = current.pixels.filter((c) => c !== null).length;
    return painted === 10 ? null : `남은 칸 ${painted}`;
  });

  add('되돌리기는 입력 이력을 바꾸지 않음', () => {
    let state = { pixels: createPixels(), history: createHistory() };
    state = stroke(state, [{ x: 0, y: 0 }], RED);
    const snapshot = JSON.stringify(state.history);
    undo(state.history, state.pixels);
    return JSON.stringify(state.history) === snapshot ? null : '입력 이력이 바뀜';
  });

  // ---------- 직렬화 ----------
  add('serializeDrawing / parseDrawing 왕복', () => {
    const pixels = paintCells(createPixels(), [{ x: 1, y: 0 }, { x: 15, y: 15 }], RED);
    const text = serializeDrawing(pixels);
    if (!text.startsWith('{"version":1,"size":16,"pixels":[null,"#e0393e"')) return text.slice(0, 60);
    const parsed = parseDrawing(text);
    return parsed && samePixels(parsed, pixels) ? null : '왕복 결과가 다름';
  });

  add('parseDrawing: 깨진 값은 모두 null', () => {
    const good = JSON.parse(serializeDrawing(createPixels()));
    const badPixels = (fn) => {
      const copy = JSON.parse(JSON.stringify(good));
      fn(copy);
      return JSON.stringify(copy);
    };
    const cases = [
      ['"abc" 문자열', 'abc'],
      ['JSON 문자열 "abc"', '"abc"'],
      ['빈 문자열', ''],
      ['null 텍스트', 'null'],
      ['배열만', JSON.stringify(createPixels())],
      ['짧은 배열', badPixels((d) => { d.pixels = d.pixels.slice(0, 255); })],
      ['긴 배열', badPixels((d) => { d.pixels.push(null); })],
      ['버전 다름', badPixels((d) => { d.version = 2; })],
      ['크기 다름', badPixels((d) => { d.size = 8; })],
      ['대문자 HEX', badPixels((d) => { d.pixels[3] = '#E0393E'; })],
      ['짧은 HEX', badPixels((d) => { d.pixels[3] = '#abc'; })],
      ['숫자 색', badPixels((d) => { d.pixels[3] = 5; })],
      ['색 이름', badPixels((d) => { d.pixels[3] = 'red'; })],
      ['pixels 없음', badPixels((d) => { delete d.pixels; })],
      ['문자열이 아님', undefined]
    ];
    const wrong = cases.filter(([, text]) => parseDrawing(text) !== null).map(([label]) => label);
    return wrong.length === 0 ? null : `null이 아님: ${wrong.join(', ')}`;
  });

  add('parseSettings: 정상 값 유지', () => {
    const input = { color: RED, tool: 'fill', customColor: '#12ab34', grid: false, scale: 32 };
    const parsed = parseSettings(JSON.stringify(input));
    return sameJson(parsed, input) ? null : show(parsed);
  });

  add('parseSettings: 지우개 상태(color null) 유지', () => {
    const parsed = parseSettings(JSON.stringify({ color: null, tool: 'eraser' }));
    return parsed.color === null && parsed.tool === 'eraser' ? null : show(parsed);
  });

  add('parseSettings: 이상한 필드는 기본값', () => {
    const defaults = defaultSettings();
    const parsed = parseSettings(JSON.stringify({ color: 'red', tool: 'brush', customColor: 12, grid: 'yes', scale: 4 }));
    if (!sameJson(parsed, defaults)) return show(parsed);
    const broken = ['abc', '', '[]', 'null', '42', undefined];
    const wrong = broken.filter((text) => !sameJson(parseSettings(text), defaults));
    return wrong.length === 0 ? null : `기본값이 아님: ${show(wrong)}`;
  });

  add('defaultSettings: 검정·펜·격자 켬·16배', () => {
    const d = defaultSettings();
    const ok = d.color === DEFAULT_COLOR && d.tool === 'pen' && d.grid === true && d.scale === DEFAULT_SCALE && d.customColor === '#ff6f61';
    return ok ? null : show(d);
  });

  // ---------- PNG ----------
  add('hexToRgb', () => {
    const cases = [[RED, [224, 57, 62]], ['#000000', [0, 0, 0]], ['#ffffff', [255, 255, 255]]];
    const wrong = cases.filter(([hex, rgb]) => !sameJson(hexToRgb(hex), rgb));
    return wrong.length === 0 ? null : show(wrong);
  });

  SCALES.forEach((scale) => {
    add(`toRgba ${scale}배: 크기 ${16 * scale}px, 칸 경계까지 색 그대로, 빈 칸 알파 0`, () => {
      // (0,0) 빨강, (1,0) 빈 칸, (0,1) 파랑, (15,15) 초록
      let pixels = createPixels();
      pixels = paintCells(pixels, [{ x: 0, y: 0 }], RED);
      pixels = paintCells(pixels, [{ x: 0, y: 1 }], BLUE);
      pixels = paintCells(pixels, [{ x: 15, y: 15 }], GREEN);
      const { width, height, data } = toRgba(pixels, SIZE, scale);
      if (width !== 16 * scale || height !== 16 * scale) return `크기 ${width}×${height}`;
      if (data.length !== width * height * 4) return `바이트 수 ${data.length}`;
      const at = (px, py) => Array.from(data.slice((py * width + px) * 4, (py * width + px) * 4 + 4));
      const red = [224, 57, 62, 255];
      const blue = hexToRgb(BLUE).concat([255]);
      const green = hexToRgb(GREEN).concat([255]);
      const clear = [0, 0, 0, 0];
      const checks = [
        [0, 0, red],
        [scale - 1, 0, red],
        [scale - 1, scale - 1, red],
        [0, scale - 1, red],
        [scale, 0, clear],
        [scale, scale - 1, clear],
        [0, scale, blue],
        [scale - 1, 2 * scale - 1, blue],
        [0, 2 * scale, clear],
        [width - 1, height - 1, green],
        [15 * scale, 15 * scale, green],
        [15 * scale - 1, 15 * scale, clear]
      ];
      for (const [px, py, expected] of checks) {
        if (!sameJson(at(px, py), expected)) return `(${px}, ${py}) = ${show(at(px, py))}, 기대 ${show(expected)}`;
      }
      // 나온 색 종류 = 그림에 쓴 색 3개 + 투명
      const kinds = new Set();
      for (let i = 0; i < data.length; i += 4) kinds.add(data.slice(i, i + 4).join(','));
      return kinds.size === 4 ? null : `색 종류 ${kinds.size}`;
    });
  });

  add('toRgba: 빈 그림은 모두 알파 0, 입력은 그대로', () => {
    const pixels = createPixels();
    const { data } = toRgba(pixels, SIZE, 8);
    if (!data.every((v) => v === 0)) return '0이 아닌 바이트가 있음';
    return isBlank(pixels) ? null : '입력이 바뀜';
  });

  add('toRgba: 칠한 칸은 모두 알파 255', () => {
    const pixels = floodFill(createPixels(), 0, 0, '#ffffff');
    const { data } = toRgba(pixels, SIZE, 1);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 255) return `알파 ${data[i]} (바이트 ${i})`;
    }
    return null;
  });

  add('makeFileName: 현지 시간 형식', () => {
    const name = makeFileName(new Date(2026, 10, 20, 15, 32, 4), 256);
    if (name !== 'kokkok-20261120-153204-256px.png') return name;
    const early = makeFileName(new Date(2027, 0, 2, 3, 4, 5), 16);
    return early === 'kokkok-20270102-030405-16px.png' ? null : early;
  });

  add('SCALES·DEFAULT_SCALE', () => {
    if (!sameJson(SCALES, [1, 8, 16, 32])) return show(SCALES);
    return DEFAULT_SCALE === 16 ? null : String(DEFAULT_SCALE);
  });

  // ---------- 팔레트 ----------
  add('PALETTE: 16색, 소문자 HEX, 중복 없음, 기본 색 검정', () => {
    if (PALETTE.length !== 16) return `색 수 ${PALETTE.length}`;
    if (!PALETTE.every((c) => /^#[0-9a-f]{6}$/.test(c.hex) && c.name)) return '형식이 틀린 색이 있음';
    if (new Set(PALETTE.map((c) => c.hex)).size !== 16) return '중복 색';
    if (PALETTE[0].hex !== DEFAULT_COLOR || DEFAULT_COLOR !== '#14161c') return '기본 색이 검정이 아님';
    return null;
  });

  add('colorName / describeColor', () => {
    if (colorName(RED) !== '빨강') return colorName(RED);
    if (colorName('#E0393E') !== '빨강') return '대문자 HEX를 못 찾음';
    if (colorName('#12ab34') !== null) return '팔레트에 없는 색인데 이름이 있음';
    if (describeColor(RED) !== '빨강') return describeColor(RED);
    if (describeColor('#12ab34') !== '#12ab34') return describeColor('#12ab34');
    return describeColor(null) === '빈 칸' ? null : describeColor(null);
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
