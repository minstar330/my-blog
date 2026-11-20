// 모아 — 화면 렌더링과 입력 처리
//
// 게임 상태는 game.js의 순수 함수로 계산하고, 이 파일은 화면을 그 결과에 맞춘다.
// 전역 변수를 만들지 않고 모듈 스코프만 쓴다.

import { createGame, move, continueGame, WIN_VALUE } from './game.js';
import { loadBestScore, saveBestScore } from './storage.js';

const MOVE_MS = 120; // style.css의 --move-duration과 같게 둔다
const GAIN_MS = 600;
const SWIPE_MIN_PX = 30;
const LIVE_DELAY_MS = 50;

const KEY_DIRECTIONS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right'
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const el = {
  board: document.getElementById('board'),
  cellLayer: document.getElementById('cell-layer'),
  tileLayer: document.getElementById('tile-layer'),
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  gain: document.getElementById('score-gain'),
  panel: document.getElementById('panel'),
  panelTitle: document.getElementById('panel-title'),
  panelText: document.getElementById('panel-text'),
  panelActions: document.getElementById('panel-actions'),
  newGame: document.getElementById('new-game'),
  live: document.getElementById('live')
};

// 화면 상태 (모듈 안에서만 쓴다)
const app = {
  state: null,
  bestScore: loadBestScore(),
  tiles: new Map(), // 타일 id → DOM 요소
  busy: false, // 이동 애니메이션 중인가
  queued: null, // 애니메이션 중 들어온 입력 1개
  moveTimer: null,
  gainTimer: null,
  liveTimer: null,
  panel: null, // { mode, options } | null
  panelReturn: null, // 새 게임 확인을 취소하면 돌아갈 패널
  pointer: null // 추적 중인 첫 포인터 { id, x, y }
};

// ---------- 공통 ----------

function formatNumber(value) {
  return value.toLocaleString('ko-KR');
}

function moveDuration() {
  return reducedMotion.matches ? 0 : MOVE_MS;
}

function tilesOf(state) {
  return state.grid.flat().filter(Boolean);
}

function announce(message) {
  if (!message) return;
  clearTimeout(app.liveTimer);
  el.live.textContent = '';
  // 같은 문구가 이어져도 다시 읽히도록 비운 뒤 잠시 후 채운다.
  app.liveTimer = setTimeout(() => {
    el.live.textContent = message;
  }, LIVE_DELAY_MS);
}

// ---------- 타일 렌더링 ----------

function setPosition(element, row, col) {
  element.style.setProperty('--row', String(row));
  element.style.setProperty('--col', String(col));
}

function digitsClass(value) {
  const digits = String(value).length;
  if (digits <= 2) return null;
  return `tile-digits-${Math.min(digits, 5)}`;
}

function createTileElement(tile, effect) {
  const element = document.createElement('div');
  element.className = 'tile';
  const digits = digitsClass(tile.value);
  if (digits) element.classList.add(digits);
  if (effect) {
    element.classList.add(effect);
    element.addEventListener('animationend', () => element.classList.remove(effect), { once: true });
  }

  const inner = document.createElement('span');
  inner.className = 'tile-inner';
  inner.dataset.value = String(tile.value);
  if (tile.value > WIN_VALUE) inner.classList.add('tile-super');
  inner.textContent = String(tile.value);

  element.appendChild(inner);
  setPosition(element, tile.row, tile.col);
  return element;
}

function addTile(tile, effect) {
  const element = createTileElement(tile, effect);
  el.tileLayer.appendChild(element);
  app.tiles.set(tile.id, element);
}

function removeTile(id) {
  const element = app.tiles.get(id);
  if (element) element.remove();
  app.tiles.delete(id);
}

function renderCells(size) {
  const cells = [];
  for (let i = 0; i < size * size; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cells.push(cell);
  }
  el.cellLayer.replaceChildren(...cells);
}

// 새 판: 타일 층을 비우고 모든 타일을 새로 그린다.
function renderAll(state) {
  el.tileLayer.replaceChildren();
  app.tiles.clear();
  tilesOf(state).forEach((tile) => addTile(tile, 'tile-new'));
}

// 이동: 남는 타일은 위치만 바꾸고, 합쳐진·새 타일은 이동이 끝난 뒤 붙인다.
// 이동이 끝났을 때 실행할 함수를 돌려준다.
function renderMove(state) {
  const keep = new Set();
  const toRemove = [];
  const toAdd = [];

  tilesOf(state).forEach((tile) => {
    if (tile.mergedFrom) {
      tile.mergedFrom.forEach((source) => {
        const element = app.tiles.get(source.id);
        if (element) setPosition(element, source.row, source.col);
        toRemove.push(source.id);
      });
      toAdd.push({ tile, effect: 'tile-merged' });
      return;
    }
    if (tile.isNew || !app.tiles.has(tile.id)) {
      toAdd.push({ tile, effect: tile.isNew ? 'tile-new' : null });
      return;
    }
    setPosition(app.tiles.get(tile.id), tile.row, tile.col);
    keep.add(tile.id);
  });

  // 상태에 없는 요소(예상 밖의 남은 요소)도 함께 정리한다.
  app.tiles.forEach((element, id) => {
    if (!keep.has(id) && !toRemove.includes(id)) toRemove.push(id);
  });

  return () => {
    toRemove.forEach(removeTile);
    toAdd.forEach(({ tile, effect }) => addTile(tile, effect));
  };
}

// ---------- 점수판 ----------

function showGain(gain) {
  clearTimeout(app.gainTimer);
  el.gain.textContent = `+${formatNumber(gain)}`;
  el.gain.classList.remove('is-showing');
  void el.gain.offsetWidth; // 애니메이션을 처음부터 다시 시작
  el.gain.classList.add('is-showing');
  app.gainTimer = setTimeout(() => {
    el.gain.classList.remove('is-showing');
  }, GAIN_MS);
}

function hideGain() {
  clearTimeout(app.gainTimer);
  el.gain.classList.remove('is-showing');
  el.gain.textContent = '';
}

function updateScore(gain) {
  const { score } = app.state;
  el.score.textContent = formatNumber(score);
  if (score > app.bestScore) {
    app.bestScore = score;
    saveBestScore(score);
  }
  el.best.textContent = formatNumber(app.bestScore);
  if (gain > 0) showGain(gain);
}

// ---------- 패널 ----------

function panelContent(mode, options = {}) {
  const score = formatNumber(app.state.score);
  if (mode === 'win') {
    return {
      title: '2048 달성!',
      text: '같은 판을 이어서 더 큰 수에 도전할 수 있어요.',
      actions: [['continue', '계속하기'], ['new', '새 게임']]
    };
  }
  if (mode === 'over') {
    return {
      title: '더 움직일 수 없어요',
      text: options.reachedWin ? `최종 점수 ${score}점 · 2048 달성!` : `최종 점수 ${score}점`,
      actions: [['new', '다시 하기']]
    };
  }
  return {
    title: '진행 중인 판을 끝낼까요?',
    text: `지금 점수 ${score}점은 사라지고 새 판이 시작돼요.`,
    actions: [['new', '새 게임'], ['cancel', '계속하기']],
    // Enter를 두 번 눌러 판이 지워지지 않도록 안전한 쪽에 먼저 포커스를 둔다.
    focus: 'cancel'
  };
}

function createPanelButton([action, label], index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = index === 0 ? 'button' : 'button button-secondary';
  button.dataset.action = action;
  button.textContent = label;
  return button;
}

// 패널을 열고, 화면 낭독기에 알릴 문구를 돌려준다.
function openPanel(mode, options = {}) {
  const content = panelContent(mode, options);
  app.panel = { mode, options };
  el.panelTitle.textContent = content.title;
  el.panelText.textContent = content.text;
  el.panelActions.replaceChildren(...content.actions.map(createPanelButton));
  el.panel.dataset.mode = mode;
  el.panel.hidden = false;
  const focusTarget = content.focus
    ? el.panelActions.querySelector(`button[data-action='${content.focus}']`)
    : null;
  (focusTarget || el.panelActions.querySelector('button')).focus();
  return `${content.title} ${content.text}`;
}

// 승리·게임 오버 패널을 연다. 이동 애니메이션 중에 새 게임 확인 패널이 먼저 열렸다면
// 그 패널을 덮지 않고, "계속하기"로 확인을 취소했을 때 이 패널이 열리게 한다.
function openResultPanel(mode, options = {}) {
  if (app.panel && app.panel.mode === 'confirm') {
    app.panelReturn = { mode, options };
    const content = panelContent(mode, options);
    return `${content.title} ${content.text}`;
  }
  return openPanel(mode, options);
}

function closePanel() {
  app.panel = null;
  app.panelReturn = null;
  el.panel.hidden = true;
  el.panelActions.replaceChildren();
  el.newGame.focus();
}

function cancelConfirm() {
  const previous = app.panelReturn;
  if (previous) {
    openPanel(previous.mode, previous.options);
    app.panelReturn = null;
  } else {
    closePanel();
  }
}

function handlePanelAction(action) {
  if (action === 'continue') {
    app.state = continueGame(app.state);
    closePanel();
  } else if (action === 'new') {
    startNewGame();
  } else if (action === 'cancel') {
    cancelConfirm();
  }
}

// ---------- 게임 진행 ----------

function resetAnimation() {
  clearTimeout(app.moveTimer);
  app.moveTimer = null;
  app.busy = false;
  app.queued = null;
}

function startNewGame() {
  resetAnimation();
  app.state = createGame({ random: Math.random });
  renderAll(app.state);
  hideGain();
  updateScore(0);
  if (app.panel) closePanel();
}

// 이동이 끝난 뒤: 알림과 승리·게임 오버 패널
function afterMove(result) {
  const messages = [];
  if (result.scoreGained > 0) {
    messages.push(`점수 ${formatNumber(app.state.score)}점, ${formatNumber(result.scoreGained)}점 획득`);
  }
  if (app.state.over) {
    messages.push(openResultPanel('over', { reachedWin: result.justWon }));
  } else if (result.justWon) {
    messages.push(openResultPanel('win'));
  }
  announce(messages.join(' '));
}

function finishMove(finish, result) {
  app.moveTimer = null;
  app.busy = false;
  finish();
  afterMove(result);

  const next = app.queued;
  app.queued = null;
  if (next && !app.panel) {
    void el.tileLayer.offsetWidth; // 방금 붙인 타일의 위치를 확정해 다음 이동이 자연스럽게 움직이게 한다
    requestMove(next);
  }
}

function runMove(direction) {
  const result = move(app.state, direction, Math.random);
  if (!result.moved) return;

  app.state = result.state;
  updateScore(result.scoreGained);
  const finish = renderMove(app.state);

  const duration = moveDuration();
  if (duration === 0) {
    finishMove(finish, result);
    return;
  }
  app.busy = true;
  app.moveTimer = setTimeout(() => finishMove(finish, result), duration);
}

function requestMove(direction) {
  if (app.panel) return;
  if (app.busy) {
    if (app.queued === null) app.queued = direction;
    return;
  }
  runMove(direction);
}

function handleNewGameButton() {
  if (app.panel && app.panel.mode === 'confirm') return;
  if (app.state.score === 0 || app.state.over) {
    startNewGame();
    return;
  }
  // 승리 패널 위에서 눌렀다면, 취소할 때 승리 패널로 돌아간다.
  const previous = app.panel;
  openPanel('confirm');
  app.panelReturn = previous;
}

// ---------- 입력 ----------

function directionFromKey(key) {
  if (typeof key !== 'string') return null;
  const normalized = key.length === 1 ? key.toLowerCase() : key;
  return Object.prototype.hasOwnProperty.call(KEY_DIRECTIONS, normalized)
    ? KEY_DIRECTIONS[normalized]
    : null;
}

function handleKeydown(event) {
  if (event.ctrlKey || event.altKey || event.metaKey) return;

  if (event.key === 'Escape' && app.panel && app.panel.mode === 'confirm') {
    event.preventDefault();
    cancelConfirm();
    return;
  }

  const direction = directionFromKey(event.key);
  if (!direction || app.panel) return;
  event.preventDefault();
  requestMove(direction);
}

function swipeDirection(dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < SWIPE_MIN_PX) return null;
  if (ax > ay) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function handlePointerDown(event) {
  if (app.pointer) return; // 멀티터치는 첫 포인터만 추적
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  app.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  try {
    el.board.setPointerCapture(event.pointerId);
  } catch (error) {
    // 캡처하지 못해도 보드 안에서 끝난 스와이프는 처리된다.
  }
}

function handlePointerUp(event) {
  if (!app.pointer || event.pointerId !== app.pointer.id) return;
  const direction = swipeDirection(event.clientX - app.pointer.x, event.clientY - app.pointer.y);
  app.pointer = null;
  if (direction) requestMove(direction);
}

function handlePointerCancel(event) {
  if (app.pointer && event.pointerId === app.pointer.id) app.pointer = null;
}

// 블로그(다른 탭)에서 테마를 바꾸면 바로 따라간다. 앱은 theme 키에 쓰지 않는다.
function handleStorage(event) {
  if (event.key !== 'theme' && event.key !== null) return;
  const value = event.key === null ? null : event.newValue;
  const root = document.documentElement;
  if (value === 'dark' || value === 'light') {
    root.setAttribute('data-theme', value);
  } else {
    root.removeAttribute('data-theme');
  }
}

// ---------- 시작 ----------

function init() {
  document.addEventListener('keydown', handleKeydown);
  el.board.addEventListener('pointerdown', handlePointerDown);
  el.board.addEventListener('pointerup', handlePointerUp);
  el.board.addEventListener('pointercancel', handlePointerCancel);
  el.board.addEventListener('lostpointercapture', handlePointerCancel);
  el.newGame.addEventListener('click', handleNewGameButton);
  el.panelActions.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) handlePanelAction(button.dataset.action);
  });
  window.addEventListener('storage', handleStorage);

  app.state = createGame({ random: Math.random });
  renderCells(app.state.size);
  renderAll(app.state);
  updateScore(0);
}

init();
