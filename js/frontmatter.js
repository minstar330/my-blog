// 글 상단의 front matter(--- 로 감싼 메타데이터)를 파싱한다.
//
// ---
// title: 글 제목
// date: 2026-11-18
// tags: [javascript, css]
// ---

// 값 양끝의 따옴표를 벗긴다.
function unquote(value) {
  const match = value.match(/^(["'])(.*)\1$/);
  return match ? match[2] : value;
}

// '[a, b]' 형태는 배열로, 나머지는 문자열로 바꾼다.
function parseValue(raw) {
  const value = raw.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => unquote(item.trim()))
      .filter((item) => item !== '');
  }
  return unquote(value);
}

export function parseFrontMatter(text) {
  const src = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = src.split('\n');

  if (lines[0].trim() !== '---') {
    return { meta: {}, body: src };
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (end === -1) {
    return { meta: {}, body: src };
  }

  const meta = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (match) {
      meta[match[1]] = parseValue(match[2]);
    }
  }

  return { meta, body: lines.slice(end + 1).join('\n') };
}
