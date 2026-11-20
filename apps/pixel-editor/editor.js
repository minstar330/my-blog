// 그림 데이터·도구·이력·직렬화 로직 (순수 모듈: DOM·localStorage·window를 쓰지 않는다)
//
// 모든 함수는 입력을 바꾸지 않고 새 값을 돌려준다.
// 바뀐 게 없으면 입력과 같은 참조를 돌려주므로, 호출하는 쪽은 === 로 "변화 없음"을 알 수 있다.
//
// Color: '#rrggbb'(소문자 6자리) | null(빈 칸)
// Pixels: Color[] — 길이 size * size, 행 우선(인덱스 = y * size + x)

import { DEFAULT_COLOR } from './palette.js';
import { SCALES, DEFAULT_SCALE } from './png.js';

export const SIZE = 16;
export const HISTORY_LIMIT = 50;
export const TOOLS = ['pen', 'eraser', 'fill', 'picker'];
export const DEFAULT_CUSTOM_COLOR = '#ff6f61';

const HEX_PATTERN = /^#[0-9a-f]{6}$/;

// ---------- 기본 ----------

export function createPixels(size = SIZE) {
  return new Array(size * size).fill(null);
}

export function inBounds(x, y, size = SIZE) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size && y < size;
}

export function getPixel(pixels, x, y, size = SIZE) {
  if (!inBounds(x, y, size)) return null;
  return pixels[y * size + x];
}

export function isBlank(pixels) {
  return pixels.every((color) => color === null);
}

export function samePixels(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// '#ABC', '#aabbcc', 'AABBCC' 등을 '#aabbcc'로. 올바르지 않으면 null
export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(text)) {
    return '#' + text.split('').map((ch) => ch + ch).join('');
  }
  if (/^[0-9a-f]{6}$/.test(text)) return '#' + text;
  return null;
}

// ---------- 그리기 ----------

// 브레젠험 직선이 지나는 칸 (양 끝 포함, 시작 → 끝 순서). 같은 점이면 [start]
export function lineCells(x0, y0, x1, y1) {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;

  for (;;) {
    cells.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
}

// 여러 칸을 한 색으로(지우개는 color = null). 범위 밖 칸은 건너뜀
export function paintCells(pixels, cells, color, size = SIZE) {
  let next = pixels;
  cells.forEach(({ x, y }) => {
    if (!inBounds(x, y, size)) return;
    const index = y * size + x;
    if (next[index] === color) return;
    if (next === pixels) next = pixels.slice();
    next[index] = color;
  });
  return next;
}

// 4방향 같은 색 영역 채우기(빈 칸 영역 포함). 시작 칸 색 === color면 같은 참조
export function floodFill(pixels, x, y, color, size = SIZE) {
  if (!inBounds(x, y, size)) return pixels;
  const target = pixels[y * size + x];
  if (target === color) return pixels;

  const next = pixels.slice();
  const stack = [y * size + x];
  next[y * size + x] = color;

  while (stack.length > 0) {
    const index = stack.pop();
    const cx = index % size;
    const cy = (index - cx) / size;
    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1]
    ];
    neighbors.forEach(([nx, ny]) => {
      if (!inBounds(nx, ny, size)) return;
      const nIndex = ny * size + nx;
      if (next[nIndex] !== target) return;
      next[nIndex] = color;
      stack.push(nIndex);
    });
  }
  return next;
}

// 스포이트: 그 칸의 색(빈 칸이면 null)
export function pickColor(pixels, x, y, size = SIZE) {
  return getPixel(pixels, x, y, size);
}

// ---------- 이력 ----------

export function createHistory(limit = HISTORY_LIMIT) {
  return { past: [], future: [], limit };
}

// 동작 전 그림(before)과 후 그림(after)이 다르면 before를 past에 넣고 future를 비움. 같으면 같은 참조
export function commit(history, before, after) {
  if (samePixels(before, after)) return history;
  const past = history.past.concat([before]);
  const overflow = past.length - history.limit;
  return {
    past: overflow > 0 ? past.slice(overflow) : past,
    future: [],
    limit: history.limit
  };
}

export function canUndo(history) {
  return history.past.length > 0;
}

export function canRedo(history) {
  return history.future.length > 0;
}

// 할 게 없으면 null
export function undo(history, current) {
  if (!canUndo(history)) return null;
  const pixels = history.past[history.past.length - 1];
  return {
    history: {
      past: history.past.slice(0, -1),
      future: history.future.concat([current]),
      limit: history.limit
    },
    pixels
  };
}

export function redo(history, current) {
  if (!canRedo(history)) return null;
  const pixels = history.future[history.future.length - 1];
  return {
    history: {
      past: history.past.concat([current]),
      future: history.future.slice(0, -1),
      limit: history.limit
    },
    pixels
  };
}

// ---------- 직렬화 (storage.js가 사용) ----------

export function serializeDrawing(pixels, size = SIZE) {
  return JSON.stringify({ version: 1, size, pixels });
}

// 형식·길이·색 값이 하나라도 이상하면 null (부분 복구하지 않음)
export function parseDrawing(text, size = SIZE) {
  if (typeof text !== 'string') return null;
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return null;
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  if (data.version !== 1 || data.size !== size) return null;
  const { pixels } = data;
  if (!Array.isArray(pixels) || pixels.length !== size * size) return null;
  const valid = pixels.every((color) => color === null || (typeof color === 'string' && HEX_PATTERN.test(color)));
  return valid ? pixels.slice() : null;
}

export function defaultSettings() {
  return {
    color: DEFAULT_COLOR,
    tool: 'pen',
    customColor: DEFAULT_CUSTOM_COLOR,
    grid: true,
    scale: DEFAULT_SCALE
  };
}

// 이상한 필드는 기본값으로 바꿔 항상 올바른 Settings를 돌려줌
export function parseSettings(text) {
  const settings = defaultSettings();
  if (typeof text !== 'string') return settings;
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return settings;
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return settings;

  if (data.color === null) {
    settings.color = null;
  } else if (typeof data.color === 'string' && HEX_PATTERN.test(data.color)) {
    settings.color = data.color;
  }
  if (TOOLS.includes(data.tool)) settings.tool = data.tool;
  if (typeof data.customColor === 'string' && HEX_PATTERN.test(data.customColor)) {
    settings.customColor = data.customColor;
  }
  if (typeof data.grid === 'boolean') settings.grid = data.grid;
  if (SCALES.includes(data.scale)) settings.scale = data.scale;
  return settings;
}
