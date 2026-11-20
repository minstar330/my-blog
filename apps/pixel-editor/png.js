// PNG 저장용 변환 (순수 모듈: DOM·localStorage·window를 쓰지 않는다)
//
// 확대는 브라우저의 drawImage 보간에 맡기지 않고, 여기서 RGBA 바이트를 직접 만든다.
// 각 칸을 scale×scale 블록으로 그대로 복사하므로 테두리가 흐려질 틈이 없다.

export const SCALES = [1, 8, 16, 32];
export const DEFAULT_SCALE = 16;

// '#e0393e' → [224, 57, 62]
export function hexToRgb(hex) {
  const value = parseInt(String(hex).slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// 칸 하나를 scale×scale 블록으로 늘린 RGBA 바이트. 빈 칸은 [0,0,0,0], 색 칸은 알파 255
export function toRgba(pixels, size, scale) {
  const width = size * scale;
  const height = size * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  const cache = new Map();

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const color = pixels[y * size + x];
      if (color === null || color === undefined) continue; // 이미 0으로 채워져 있음(투명)
      if (!cache.has(color)) cache.set(color, hexToRgb(color));
      const [r, g, b] = cache.get(color);
      for (let dy = 0; dy < scale; dy += 1) {
        let offset = ((y * scale + dy) * width + x * scale) * 4;
        for (let dx = 0; dx < scale; dx += 1) {
          data[offset] = r;
          data[offset + 1] = g;
          data[offset + 2] = b;
          data[offset + 3] = 255;
          offset += 4;
        }
      }
    }
  }

  return { width, height, data };
}

function pad2(number) {
  return String(number).padStart(2, '0');
}

// makeFileName(new Date(2026, 10, 20, 15, 32, 4), 256) → 'kokkok-20261120-153204-256px.png'
// 기기 현지 시간을 쓴다.
export function makeFileName(date, width) {
  const day = String(date.getFullYear()) + pad2(date.getMonth() + 1) + pad2(date.getDate());
  const time = pad2(date.getHours()) + pad2(date.getMinutes()) + pad2(date.getSeconds());
  return `kokkok-${day}-${time}-${width}px.png`;
}
