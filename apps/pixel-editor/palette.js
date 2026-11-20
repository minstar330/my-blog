// 기본 팔레트 (순수 모듈: DOM·localStorage·window를 쓰지 않는다)
//
// 팔레트 색은 UI 색이 아니라 "그림 데이터"라서 테마와 무관하게 고정이다.
// 그래서 CSS 변수 대신 여기에 HEX로 두고, 스와치는 인라인 CSS 변수(--swatch-color)로 칠한다.

export const PALETTE = [
  { name: '검정', hex: '#14161c' },
  { name: '짙은 회색', hex: '#4a5060' },
  { name: '연회색', hex: '#a7adba' },
  { name: '흰색', hex: '#ffffff' },
  { name: '빨강', hex: '#e0393e' },
  { name: '주황', hex: '#f28c28' },
  { name: '노랑', hex: '#f7d038' },
  { name: '연두', hex: '#8fd14f' },
  { name: '초록', hex: '#2e9e5b' },
  { name: '청록', hex: '#1fb5a8' },
  { name: '하늘', hex: '#5ab8f0' },
  { name: '파랑', hex: '#2f5fd0' },
  { name: '보라', hex: '#6a4bc4' },
  { name: '분홍', hex: '#f07aa8' },
  { name: '살구', hex: '#f5c6a0' },
  { name: '갈색', hex: '#8a5a3c' }
];

export const DEFAULT_COLOR = '#14161c';

// 팔레트에 있는 색이면 이름, 아니면 null
export function colorName(hex) {
  if (typeof hex !== 'string') return null;
  const lower = hex.toLowerCase();
  const found = PALETTE.find((entry) => entry.hex === lower);
  return found ? found.name : null;
}

// 알림·레이블용 설명: '빨강' / '#12ab34' / '빈 칸'
export function describeColor(color) {
  if (color === null || color === undefined) return '빈 칸';
  return colorName(color) || String(color).toLowerCase();
}
