// 여러 모듈에서 함께 쓰는 작은 함수들

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

// HTML 특수문자를 이스케이프한다.
export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

// 링크·이미지 주소로 써도 안전한지 검사한다.
// http, https, mailto, 상대 경로, #앵커만 허용한다.
export function isSafeUrl(url) {
  const value = String(url).trim();
  if (value === '') return false;

  // 제어 문자·공백을 끼워 넣어 스킴 검사를 우회하는 것을 막는다.
  const normalized = value.replace(/[\u0000- \u007f]/g, '').toLowerCase();
  const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/);
  if (!scheme) return true; // 상대 경로, #앵커, /경로
  return ['http', 'https', 'mailto'].includes(scheme[1]);
}

// '2026-11-18' → '2026년 11월 18일'
export function formatDate(iso) {
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(iso);
  const [, y, m, d] = match;
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}
