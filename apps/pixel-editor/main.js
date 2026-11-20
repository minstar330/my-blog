// 콕콕 — 앱 시작, 입력 처리, 화면 갱신
//
// 그림·이력 계산은 editor.js의 순수 함수에 맡기고, 여기서는 상태를 보관하고
// 포인터·키보드 입력과 버튼·대화상자·저장을 연결한다.

import {
  SIZE,
  TOOLS,
  DEFAULT_CUSTOM_COLOR,
  createPixels,
  getPixel,
  isBlank,
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
  redo
} from './editor.js';
import { PALETTE, DEFAULT_COLOR, colorName, describeColor } from './palette.js';
import { SCALES, toRgba, makeFileName } from './png.js';
import { loadDrawing, saveDrawing, loadSettings, saveSettings, isStorageAvailable } from './storage.js';
import { fitCanvas, cellCoords, cellFromPoint, render, readCanvasColors } from './view.js';

const TOOL_NAMES = { pen: '펜', eraser: '지우개', fill: '채우기', picker: '스포이트' };
const SHORTCUT_TOOLS = { b: 'pen', e: 'eraser', f: 'fill', i: 'picker' };

const root = document.documentElement;
const editorEl = document.getElementById('editor');
const canvas = document.getElementById('canvas');
const colorChip = document.getElementById('color-chip');
const colorLabel = document.getElementById('color-label');
const toolButtons = Array.from(document.querySelectorAll('[data-tool]'));
const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');
const gridButton = document.getElementById('grid-toggle');
const clearButton = document.getElementById('clear');
const paletteEl = document.getElementById('palette');
const customSwatch = document.getElementById('custom-swatch');
const customInput = document.getElementById('custom-input');
const saveButton = document.getElementById('save-button');
const storageNote = document.getElementById('storage-note');
const clearDialog = document.getElementById('clear-dialog');
const clearCancel = document.getElementById('clear-cancel');
const clearConfirm = document.getElementById('clear-confirm');
const saveDialog = document.getElementById('save-dialog');
const scaleOptions = document.getElementById('scale-options');
const previewImage = document.getElementById('preview-image');
const blankNote = document.getElementById('blank-note');
const downloadButton = document.getElementById('download-button');
const saveClose = document.getElementById('save-close');
const live = document.getElementById('live');

// ---------- 상태 ----------
const loadedSettings = loadSettings();
const state = {
  pixels: loadDrawing() || createPixels(),
  history: createHistory(),
  // color는 펜·채우기에 쓰는 색(항상 '#rrggbb'), 지우개 여부는 tool로 구분한다.
  color: loadedSettings.color || DEFAULT_COLOR,
  tool: loadedSettings.color === null ? 'eraser' : loadedSettings.tool,
  customColor: loadedSettings.customColor,
  grid: loadedSettings.grid,
  scale: loadedSettings.scale,
  hover: null,
  cursor: { x: 0, y: 0 },
  keyboardMode: false
};

// 진행 중인 획: { source: 'pointer' | 'keyboard', pointerId, before, last, pointerType }
let stroke = null;
let renderQueued = false;
let swatchButtons = [];
let scaleInputs = [];
let previewUrl = null;
let previewToken = 0;
const dialogCleanup = new Map();
const customSupported = customInput.type === 'color';

// ---------- 저장 ----------
function persistSettings() {
  saveSettings({
    color: state.color,
    tool: state.tool,
    customColor: state.customColor,
    grid: state.grid,
    scale: state.scale
  });
}

function persistDrawing() {
  saveDrawing(state.pixels);
}

// ---------- 알림 ----------
function announce(text) {
  // 같은 문구가 이어져도 다시 읽히도록 끝에 공백을 번갈아 붙인다.
  live.textContent = live.textContent === text ? text + ' ' : text;
}

// ---------- 그리기 ----------
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    fitCanvas(canvas);
    const showCursor = state.keyboardMode && document.activeElement === canvas;
    render(canvas, {
      pixels: state.pixels,
      size: SIZE,
      grid: state.grid,
      hover: showCursor ? null : state.hover,
      cursor: showCursor ? state.cursor : null,
      colors: readCanvasColors()
    });
  });
}

// ---------- 화면 상태 갱신 ----------
function currentDrawColor() {
  return state.tool === 'eraser' ? null : state.color;
}

function updateColorDisplay() {
  const erasing = state.tool === 'eraser';
  colorChip.classList.toggle('is-empty', erasing);
  if (erasing) {
    colorChip.style.removeProperty('--chip-color');
    colorLabel.replaceChildren('빈 칸(지우개)');
  } else {
    // 그림 색은 데이터라서 인라인 CSS 변수로 넘긴다.
    colorChip.style.setProperty('--chip-color', state.color);
    const strong = document.createElement('strong');
    strong.textContent = describeColor(state.color);
    colorLabel.replaceChildren('현재 색 ', strong);
  }

  swatchButtons.forEach((button) => {
    const selected = !erasing && button.dataset.color === state.color;
    button.setAttribute('aria-pressed', String(selected));
  });

  const customSelected = !erasing && state.color === state.customColor && colorName(state.color) === null;
  customSwatch.classList.toggle('is-selected', customSelected);
  customSwatch.style.setProperty('--swatch-color', state.customColor);
  if (customInput.value !== state.customColor) customInput.value = state.customColor;
  customInput.setAttribute(
    'aria-label',
    state.customColor === DEFAULT_CUSTOM_COLOR ? '직접 고르기' : `직접 고른 색 ${state.customColor}`
  );
}

function updateButtons() {
  toolButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.tool === state.tool));
  });
  gridButton.setAttribute('aria-pressed', String(state.grid));
  undoButton.disabled = !canUndo(state.history);
  redoButton.disabled = !canRedo(state.history);
  clearButton.disabled = isBlank(state.pixels);
  canvas.dataset.tool = state.tool;
  rescueFocus();
}

// 포커스를 가진 버튼이 disabled가 되면 포커스가 사라지므로 가까운 곳으로 옮긴다.
function rescueFocus() {
  const active = document.activeElement;
  if (!active || !active.disabled) return;
  if (active === undoButton && !redoButton.disabled) redoButton.focus();
  else if (active === redoButton && !undoButton.disabled) undoButton.focus();
  else canvas.focus();
}

function updateAll() {
  updateColorDisplay();
  updateButtons();
  scheduleRender();
}

// ---------- 도구·색 ----------
function setTool(tool, { silent = false } = {}) {
  if (!TOOLS.includes(tool)) return;
  state.tool = tool;
  persistSettings();
  updateAll();
  if (!silent) announce(TOOL_NAMES[tool]);
}

// 팔레트·사용자 색을 고르면: 지우개·스포이트 상태는 펜으로, 채우기는 그대로
function chooseColor(hex) {
  state.color = hex;
  const switched = state.tool === 'eraser' || state.tool === 'picker';
  if (switched) state.tool = 'pen';
  persistSettings();
  updateAll();
  announce((switched ? '펜, ' : '') + `현재 색 ${describeColor(hex)}`);
}

// ---------- 그림 바꾸기 ----------
function setPixels(next) {
  if (next === state.pixels) return false;
  state.pixels = next;
  scheduleRender();
  return true;
}

// 한 번에 끝나는 동작(채우기·Enter 칠하기·전체 지우기)을 이력에 남긴다.
function applyOnce(next) {
  const before = state.pixels;
  if (next === before) return false;
  state.pixels = next;
  state.history = commit(state.history, before, next);
  persistDrawing();
  updateButtons();
  scheduleRender();
  return true;
}

function usePicker(cell) {
  const picked = pickColor(state.pixels, cell.x, cell.y);
  if (picked === null) {
    setTool('eraser', { silent: true });
    announce('빈 칸, 지우개');
  } else {
    state.color = picked;
    setTool('pen', { silent: true });
    announce(`펜, 현재 색 ${describeColor(picked)}`);
  }
}

// 채우기·스포이트처럼 누른 순간 한 번만 실행되는 도구
function applyInstantTool(cell) {
  if (state.tool === 'fill') {
    applyOnce(floodFill(state.pixels, cell.x, cell.y, state.color));
  } else if (state.tool === 'picker') {
    usePicker(cell);
  }
}

function isStrokeTool() {
  return state.tool === 'pen' || state.tool === 'eraser';
}

function startStroke(source, cell, extra = {}) {
  stroke = { source, before: state.pixels, last: cell, ...extra };
  setPixels(paintCells(state.pixels, [cell], currentDrawColor()));
}

// 직전 칸에서 지금 칸까지 빈틈없이 칠한다(범위 밖 칸은 paintCells가 건너뜀).
function continueStroke(cell) {
  if (!stroke) return;
  const { last } = stroke;
  if (last && last.x === cell.x && last.y === cell.y) return;
  const cells = last ? lineCells(last.x, last.y, cell.x, cell.y) : [cell];
  stroke.last = cell;
  setPixels(paintCells(state.pixels, cells, currentDrawColor()));
}

// 획 끝: 바뀌었으면 이력 한 단계 + 자동 저장
function endStroke() {
  if (!stroke) return;
  const { before } = stroke;
  stroke = null;
  const nextHistory = commit(state.history, before, state.pixels);
  if (nextHistory !== state.history) {
    state.history = nextHistory;
    persistDrawing();
  }
  updateButtons();
  scheduleRender();
}

// ---------- 되돌리기·다시 하기·전체 지우기 ----------
function doUndo() {
  endStroke();
  const result = undo(state.history, state.pixels);
  if (!result) {
    announce('더 되돌릴 게 없어요');
    return;
  }
  state.history = result.history;
  state.pixels = result.pixels;
  persistDrawing();
  updateAll();
  announce('되돌렸어요');
}

function doRedo() {
  endStroke();
  const result = redo(state.history, state.pixels);
  if (!result) {
    announce('더 다시 할 게 없어요');
    return;
  }
  state.history = result.history;
  state.pixels = result.pixels;
  persistDrawing();
  updateAll();
  announce('다시 했어요');
}

function toggleGrid() {
  state.grid = !state.grid;
  persistSettings();
  updateButtons();
  scheduleRender();
  announce(state.grid ? '격자선 켬' : '격자선 끔');
}

// ---------- 포인터 입력 ----------
function onPointerDown(event) {
  if (event.button !== 0) return;
  if (stroke) return; // 첫 포인터만 추적(두 번째 손가락 등은 무시)
  state.keyboardMode = false;
  const cell = cellFromPoint(canvas, event.clientX, event.clientY, SIZE);
  if (!cell) return;
  state.hover = cell;

  if (!isStrokeTool()) {
    applyInstantTool(cell);
    scheduleRender();
    return;
  }

  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (error) {
    // 캡처를 못 해도 캔버스 위에서는 계속 그릴 수 있다.
  }
  startStroke('pointer', cell, { pointerId: event.pointerId, pointerType: event.pointerType });
}

function onPointerMove(event) {
  if (stroke && stroke.source === 'pointer') {
    if (event.pointerId !== stroke.pointerId) return;
    const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
    const list = events.length > 0 ? events : [event];
    list.forEach((item) => {
      const coords = cellCoords(canvas, item.clientX, item.clientY, SIZE);
      if (coords) continueStroke(coords);
    });
    state.hover = cellFromPoint(canvas, event.clientX, event.clientY, SIZE);
    scheduleRender();
    return;
  }
  if (stroke) return;
  // 마우스·펜이 떠 있을 때만 미리보기 테두리(터치는 끄는 동안만)
  if (event.pointerType === 'touch') return;
  const cell = cellFromPoint(canvas, event.clientX, event.clientY, SIZE);
  const prev = state.hover;
  const changed = !prev !== !cell || (prev && cell && (prev.x !== cell.x || prev.y !== cell.y));
  if (changed) {
    state.hover = cell;
    scheduleRender();
  }
}

function onPointerEnd(event) {
  if (!stroke || stroke.source !== 'pointer' || event.pointerId !== stroke.pointerId) {
    if (event.type === 'pointerup' && event.pointerType === 'touch') {
      state.hover = null;
      scheduleRender();
    }
    return;
  }
  const { pointerType } = stroke;
  // pointercancel·lostpointercapture도 그때까지 칠한 내용은 남기고 획을 끝낸다.
  endStroke();
  if (pointerType === 'touch' || event.type !== 'pointerup') state.hover = null;
  scheduleRender();
}

function onPointerLeave(event) {
  if (stroke && stroke.source === 'pointer') return;
  if (event.pointerType === 'touch') return;
  if (state.hover) {
    state.hover = null;
    scheduleRender();
  }
}

// ---------- 캔버스 키보드 ----------
function moveCursor(x, y) {
  const next = { x: Math.max(0, Math.min(SIZE - 1, x)), y: Math.max(0, Math.min(SIZE - 1, y)) };
  const moved = next.x !== state.cursor.x || next.y !== state.cursor.y;
  state.cursor = next;
  state.keyboardMode = true;
  if (moved && stroke && stroke.source === 'keyboard') continueStroke(next);
  scheduleRender();
  announceCursor();
}

function announceCursor() {
  const { x, y } = state.cursor;
  announce(`${x + 1}열 ${y + 1}행, ${describeColor(getPixel(state.pixels, x, y))}`);
}

function applyAtCursor() {
  const cell = state.cursor;
  if (isStrokeTool()) {
    applyOnce(paintCells(state.pixels, [cell], currentDrawColor()));
  } else {
    applyInstantTool(cell);
  }
}

function onCanvasKeyDown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const { x, y } = state.cursor;
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      moveCursor(x - 1, y);
      break;
    case 'ArrowRight':
      event.preventDefault();
      moveCursor(x + 1, y);
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveCursor(x, y - 1);
      break;
    case 'ArrowDown':
      event.preventDefault();
      moveCursor(x, y + 1);
      break;
    case 'Home':
      event.preventDefault();
      moveCursor(0, y);
      break;
    case 'End':
      event.preventDefault();
      moveCursor(SIZE - 1, y);
      break;
    case 'Enter':
      event.preventDefault();
      if (event.repeat || stroke) return;
      state.keyboardMode = true;
      applyAtCursor();
      scheduleRender();
      break;
    case ' ':
      event.preventDefault();
      if (event.repeat || stroke) return;
      state.keyboardMode = true;
      if (isStrokeTool()) {
        startStroke('keyboard', { ...state.cursor });
      } else {
        applyInstantTool(state.cursor);
      }
      scheduleRender();
      break;
    default:
      break;
  }
}

function onCanvasKeyUp(event) {
  if (event.key === ' ' && stroke && stroke.source === 'keyboard') {
    event.preventDefault();
    endStroke();
  }
}

function onCanvasBlur() {
  if (stroke && stroke.source === 'keyboard') endStroke();
  scheduleRender();
}

// ---------- 페이지 단축키 ----------
function anyDialogOpen() {
  return clearDialog.open || saveDialog.open;
}

// 한글 입력 상태에서는 event.key가 'ㅠ' 같은 글자라서, 영문자가 아니면 물리 키(code)로 본다.
function letterOf(event) {
  const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
  if (/^[a-z]$/.test(key)) return key;
  const match = /^Key([A-Z])$/.exec(event.code || '');
  return match ? match[1].toLowerCase() : '';
}

function onDocumentKeyDown(event) {
  if (anyDialogOpen()) return;
  const letter = letterOf(event);

  if (event.ctrlKey || event.metaKey) {
    if (event.altKey) return;
    if (letter === 'z') {
      event.preventDefault();
      if (event.shiftKey) doRedo();
      else doUndo();
    } else if (letter === 'y' && event.ctrlKey && !event.shiftKey) {
      event.preventDefault();
      doRedo();
    }
    return;
  }

  if (event.altKey) return;
  const target = event.target;
  if (!(target instanceof Element) || !editorEl.contains(target)) return;
  if (target.tagName === 'INPUT') return;

  if (SHORTCUT_TOOLS[letter]) {
    event.preventDefault();
    setTool(SHORTCUT_TOOLS[letter]);
  } else if (letter === 'g') {
    event.preventDefault();
    toggleGrid();
  }
}

// 도구 묶음 안에서 좌우 방향키로 버튼 사이를 옮긴다(Tab 순서는 그대로).
function onToolbarKeyDown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll('button')).filter((b) => !b.disabled);
  const index = buttons.indexOf(document.activeElement);
  if (index === -1) return;
  event.preventDefault();
  let next = index;
  if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
  if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = buttons.length - 1;
  buttons[next].focus();
}

// ---------- 대화상자 ----------
// 닫힌 뒤 할 일(정리·연 버튼으로 포커스 복귀)을 대화상자마다 기억해 둔다.
function openDialog(dialog, opener, focusTarget, onClose) {
  endStroke();
  dialogCleanup.set(dialog, () => {
    if (onClose) onClose();
    if (opener && !opener.disabled) opener.focus();
    else canvas.focus();
  });
  dialog.showModal();
  if (focusTarget) focusTarget.focus();
}

// 닫힌 뒤 한 번만 정리한다. 버튼으로 닫으면 바로, Esc로 닫으면 close 이벤트에서 부른다.
// (Chromium은 close 이벤트를 다음 화면 갱신 때 보내므로 버튼 쪽은 기다리지 않는다.)
function finishDialog(dialog) {
  if (dialog.open) return;
  const cleanup = dialogCleanup.get(dialog);
  if (!cleanup) return;
  dialogCleanup.delete(dialog);
  cleanup();
}

function closeDialog(dialog) {
  dialog.close();
  finishDialog(dialog);
}

function openClearDialog() {
  if (isBlank(state.pixels)) return;
  // 기본 포커스는 "취소": Enter를 두 번 눌러도 바로 지워지지 않게 한다.
  openDialog(clearDialog, clearButton, clearCancel);
}

function confirmClear() {
  const changed = applyOnce(createPixels());
  closeDialog(clearDialog);
  if (changed) {
    updateAll();
    announce('그림을 지웠어요');
  }
}

// ---------- PNG 저장 ----------
function buildScaleOptions() {
  scaleInputs = SCALES.map((scale) => {
    const label = document.createElement('label');
    label.className = 'scale-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'scale';
    input.value = String(scale);
    input.checked = scale === state.scale;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      state.scale = scale;
      persistSettings();
      refreshPreview();
    });
    const text = document.createElement('span');
    text.textContent = `${SIZE * scale}px (${scale}배)`;
    label.append(input, text);
    scaleOptions.appendChild(label);
    return input;
  });
}

function releasePreviewUrl() {
  if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
}

// 화면에 붙이지 않은 캔버스에 RGBA를 그대로 넣고 PNG로 만든다(확대 보간 없음).
function createPngUrl(pixels, scale, callback) {
  const { width, height, data } = toRgba(pixels, SIZE, scale);
  const work = document.createElement('canvas');
  work.width = width;
  work.height = height;
  work.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0);
  if (typeof work.toBlob === 'function') {
    work.toBlob((blob) => {
      callback(blob ? URL.createObjectURL(blob) : work.toDataURL('image/png'));
    }, 'image/png');
  } else {
    callback(work.toDataURL('image/png'));
  }
}

function refreshPreview() {
  previewToken += 1;
  const token = previewToken;
  downloadButton.disabled = true;
  createPngUrl(state.pixels, state.scale, (url) => {
    // 그사이 배율이 바뀌었거나 대화상자가 닫혔으면 버린다.
    if (token !== previewToken || !saveDialog.open) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      return;
    }
    const old = previewUrl;
    previewUrl = url;
    previewImage.src = url;
    if (old && old.startsWith('blob:')) URL.revokeObjectURL(old);
    downloadButton.disabled = false;
  });
}

function openSaveDialog() {
  scaleInputs.forEach((input) => {
    input.checked = Number(input.value) === state.scale;
  });
  blankNote.hidden = !isBlank(state.pixels);
  const checked = scaleInputs.find((input) => input.checked) || scaleInputs[0];
  openDialog(saveDialog, saveButton, checked, clearPreview);
  refreshPreview();
}

// 대화상자를 닫으면 미리보기 주소를 해제한다.
function clearPreview() {
  previewToken += 1;
  previewImage.removeAttribute('src');
  releasePreviewUrl();
}

function download() {
  if (!previewUrl) return;
  const fileName = makeFileName(new Date(), SIZE * state.scale);
  const link = document.createElement('a');
  link.href = previewUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  announce(`${fileName} 저장을 시작했어요`);
}

// ---------- 팔레트 ----------
function buildPalette() {
  swatchButtons = PALETTE.map(({ name, hex }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.dataset.color = hex;
    button.setAttribute('aria-label', name);
    button.setAttribute('aria-pressed', 'false');
    button.title = name;
    // 팔레트 색은 UI 색이 아니라 그림 데이터라서 인라인 CSS 변수로 넘긴다.
    button.style.setProperty('--swatch-color', hex);
    button.addEventListener('click', () => chooseColor(hex));
    paletteEl.insertBefore(button, customSwatch);
    return button;
  });

  if (!customSupported) {
    customSwatch.hidden = true;
    return;
  }
  customInput.addEventListener('click', () => {
    // 칸을 누르면 지금 사용자 색을 현재 색으로 고르고, 브라우저 색 선택기가 열린다.
    if (state.color !== state.customColor || state.tool === 'eraser' || state.tool === 'picker') {
      chooseColor(state.customColor);
    }
  });
  customInput.addEventListener('input', () => {
    const hex = normalizeHex(customInput.value);
    if (!hex) return;
    state.customColor = hex;
    chooseColor(hex);
  });
}

// ---------- 테마 ----------
// 블로그(다른 탭)에서 테마를 바꾸면 바로 따라간다. 앱은 theme 키에 쓰지 않는다.
function onStorage(event) {
  if (event.key !== 'theme' && event.key !== null) return;
  let value = null;
  try {
    value = localStorage.getItem('theme');
  } catch (error) {
    value = null;
  }
  if (value === 'dark' || value === 'light') root.setAttribute('data-theme', value);
  else root.removeAttribute('data-theme');
  scheduleRender();
}

// 브라우저 확대 등으로 devicePixelRatio가 바뀌면 캔버스를 다시 맞춘다.
function watchPixelRatio() {
  const query = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  const onChange = () => {
    query.removeEventListener('change', onChange);
    scheduleRender();
    watchPixelRatio();
  };
  query.addEventListener('change', onChange);
}

// ---------- 시작 ----------
function init() {
  buildPalette();
  buildScaleOptions();

  if (!isStorageAvailable()) storageNote.hidden = false;

  toolButtons.forEach((button) => {
    button.addEventListener('click', () => setTool(button.dataset.tool));
  });
  document.querySelectorAll('[role="toolbar"]').forEach((bar) => {
    bar.addEventListener('keydown', onToolbarKeyDown);
  });
  undoButton.addEventListener('click', doUndo);
  redoButton.addEventListener('click', doRedo);
  gridButton.addEventListener('click', toggleGrid);
  clearButton.addEventListener('click', openClearDialog);
  clearCancel.addEventListener('click', () => closeDialog(clearDialog));
  clearConfirm.addEventListener('click', confirmClear);
  clearDialog.addEventListener('close', () => finishDialog(clearDialog));
  saveButton.addEventListener('click', openSaveDialog);
  saveClose.addEventListener('click', () => closeDialog(saveDialog));
  downloadButton.addEventListener('click', download);
  saveDialog.addEventListener('close', () => finishDialog(saveDialog));

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);
  canvas.addEventListener('lostpointercapture', onPointerEnd);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('keydown', onCanvasKeyDown);
  canvas.addEventListener('keyup', onCanvasKeyUp);
  canvas.addEventListener('focus', scheduleRender);
  canvas.addEventListener('blur', onCanvasBlur);
  document.addEventListener('keydown', onDocumentKeyDown);

  window.addEventListener('storage', onStorage);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', scheduleRender);
  watchPixelRatio();

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(scheduleRender).observe(canvas);
  } else {
    window.addEventListener('resize', scheduleRender);
  }

  updateAll();
}

init();
