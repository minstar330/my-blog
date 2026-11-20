// 캔버스 그리기 (DOM 모듈)
//
// 캔버스는 CSS 변수를 직접 쓸 수 없으므로, 그릴 때마다 readCanvasColors()로 토큰 값을 읽어 넘긴다.
// 칸 경계는 정수 기기 픽셀에 맞춰 고해상도 화면에서도 번지지 않게 한다.

// 캔버스 크기를 CSS 크기 × devicePixelRatio에 맞춤. 바뀌었으면 true
export function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const size = Math.max(1, Math.round(rect.width * ratio));
  if (canvas.width === size && canvas.height === size) return false;
  canvas.width = size;
  canvas.height = size;
  return true;
}

// 화면 좌표 → 칸 좌표 (범위 밖이어도 그대로 돌려줌, 획 보간용)
export function cellCoords(canvas, clientX, clientY, size) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: Math.floor(((clientX - rect.left) / rect.width) * size),
    y: Math.floor(((clientY - rect.top) / rect.height) * size)
  };
}

// 화면 좌표 → 칸 (범위 밖이면 null)
export function cellFromPoint(canvas, clientX, clientY, size) {
  const cell = cellCoords(canvas, clientX, clientY, size);
  if (cell === null) return null;
  if (cell.x < 0 || cell.y < 0 || cell.x >= size || cell.y >= size) return null;
  return cell;
}

export function readCanvasColors() {
  const style = getComputedStyle(document.documentElement);
  const read = (name) => style.getPropertyValue(name).trim();
  return {
    checkerA: read('--checker-a'),
    checkerB: read('--checker-b'),
    gridLine: read('--grid-line'),
    hoverLine: read('--hover-line'),
    cursorInner: read('--cursor-inner'),
    cursorOuter: read('--cursor-outer')
  };
}

// i번째 칸 경계(기기 픽셀, 정수)
function makeEdge(length, size) {
  return (i) => Math.round((i * length) / size);
}

// 사각형 테두리를 fillRect 네 번으로 그린다(안쪽으로 thickness만큼).
function strokeBox(ctx, x0, y0, x1, y1, thickness, color) {
  const w = x1 - x0;
  const h = y1 - y0;
  const t = Math.min(thickness, Math.floor(w / 2), Math.floor(h / 2));
  if (t <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, w, t);
  ctx.fillRect(x0, y1 - t, w, t);
  ctx.fillRect(x0, y0 + t, t, h - 2 * t);
  ctx.fillRect(x1 - t, y0 + t, t, h - 2 * t);
}

function cellBox(edge, cell) {
  return [edge(cell.x), edge(cell.y), edge(cell.x + 1), edge(cell.y + 1)];
}

// 전체 다시 그리기
// 순서: 체크무늬(빈 칸) → 색 칸 → 격자선 → 호버/커서 테두리
export function render(canvas, { pixels, size, grid, hover, cursor, colors }) {
  const ctx = canvas.getContext('2d');
  const length = canvas.width;
  const edge = makeEdge(length, size);
  // 화면 1 CSS 픽셀이 기기 픽셀 몇 개인지 (테두리 두께 계산용)
  const cssWidth = canvas.getBoundingClientRect().width || length;
  const ratio = length / cssWidth;

  ctx.clearRect(0, 0, length, length);

  for (let y = 0; y < size; y += 1) {
    const y0 = edge(y);
    const y1 = edge(y + 1);
    for (let x = 0; x < size; x += 1) {
      const x0 = edge(x);
      const x1 = edge(x + 1);
      const color = pixels[y * size + x];
      if (color === null) {
        // 한 칸을 2×2로 나눠 번갈아 칠한다(칸 경계와 체크 경계가 맞음).
        const mx = Math.round((x0 + x1) / 2);
        const my = Math.round((y0 + y1) / 2);
        ctx.fillStyle = colors.checkerA;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillStyle = colors.checkerB;
        ctx.fillRect(mx, y0, x1 - mx, my - y0);
        ctx.fillRect(x0, my, mx - x0, y1 - my);
      } else {
        // 그림 색은 데이터라서 CSS 변수가 아니라 저장된 HEX를 그대로 쓴다.
        ctx.fillStyle = color;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
  }

  if (grid) {
    // 기기 픽셀 1px 두께의 선
    ctx.fillStyle = colors.gridLine;
    for (let i = 1; i < size; i += 1) {
      const p = edge(i);
      ctx.fillRect(p, 0, 1, length);
      ctx.fillRect(0, p, length, 1);
    }
  }

  if (hover) {
    const [x0, y0, x1, y1] = cellBox(edge, hover);
    strokeBox(ctx, x0, y0, x1, y1, Math.max(1, Math.round(ratio)), colors.hoverLine);
  }

  if (cursor) {
    // 두 겹 링: 바깥 --cursor-outer, 안쪽 --cursor-inner → 어떤 칸 색 위에서도 보인다.
    const t = Math.max(1, Math.round(2 * ratio));
    const [x0, y0, x1, y1] = cellBox(edge, cursor);
    strokeBox(ctx, x0, y0, x1, y1, t, colors.cursorOuter);
    strokeBox(ctx, x0 + t, y0 + t, x1 - t, y1 - t, t, colors.cursorInner);
  }
}
