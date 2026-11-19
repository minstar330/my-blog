// 마크다운 → HTML 변환기 (외부 라이브러리 없이 직접 구현)
//
// DOM에 의존하지 않는 순수 함수로만 작성한다.
// 원문의 HTML은 모두 이스케이프되므로, 결과를 innerHTML에 넣어도 스크립트가 실행되지 않는다.

import { escapeHtml, isSafeUrl } from './utils.js';

// ---------------------------------------------------------------------------
// 줄 판별용 정규식
// ---------------------------------------------------------------------------

const RE_FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/;
// 닫는 '#'은 앞에 공백이 있을 때만 제거한다 ('## C#'의 '#'은 남긴다).
const RE_HEADING = /^ {0,3}(#{1,6})(?:\s+(.*?))?(?:\s+#+)?\s*$/;
const RE_HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const RE_QUOTE = /^ {0,3}>/;
const RE_LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
const RE_BLANK = /^\s*$/;

// ---------------------------------------------------------------------------
// 공개 함수
// ---------------------------------------------------------------------------

export function renderMarkdown(src) {
  const normalized = String(src)
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u0000/g, ''); // 인라인 자리표시자 문자와 겹치지 않게 제거

  const ctx = { usedIds: new Map() };
  return parseBlocks(normalized.split('\n'), ctx);
}

// ---------------------------------------------------------------------------
// 블록 파싱
// ---------------------------------------------------------------------------

function isTableStart(lines, i) {
  return (
    i + 1 < lines.length &&
    lines[i].includes('|') &&
    lines[i + 1].includes('|') &&
    lines[i + 1].includes('-') &&
    RE_TABLE_SEP.test(lines[i + 1])
  );
}

// 문단을 끊고 새 블록을 시작하는 줄인지 확인한다.
function startsBlock(lines, i) {
  const line = lines[i];
  return (
    RE_FENCE.test(line) ||
    RE_HEADING.test(line) ||
    RE_HR.test(line) ||
    RE_QUOTE.test(line) ||
    RE_LIST_ITEM.test(line) ||
    isTableStart(lines, i)
  );
}

function parseBlocks(lines, ctx) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (RE_BLANK.test(line)) {
      i += 1;
      continue;
    }

    // 코드 블록
    const fence = line.match(RE_FENCE);
    if (fence) {
      const result = parseFence(lines, i, fence);
      out.push(result.html);
      i = result.next;
      continue;
    }

    // 제목
    const heading = line.match(RE_HEADING);
    if (heading) {
      out.push(renderHeading(heading[1].length, heading[2] || '', ctx));
      i += 1;
      continue;
    }

    // 수평선 (목록보다 먼저 검사해야 '* * *'가 목록으로 잡히지 않는다)
    if (RE_HR.test(line)) {
      out.push('<hr>');
      i += 1;
      continue;
    }

    // 인용문
    if (RE_QUOTE.test(line)) {
      const result = parseQuote(lines, i, ctx);
      out.push(result.html);
      i = result.next;
      continue;
    }

    // 표
    if (isTableStart(lines, i)) {
      const result = parseTable(lines, i);
      out.push(result.html);
      i = result.next;
      continue;
    }

    // 목록
    if (RE_LIST_ITEM.test(line)) {
      const result = parseList(lines, i, ctx);
      out.push(result.html);
      i = result.next;
      continue;
    }

    // 문단
    const result = parseParagraph(lines, i);
    out.push(result.html);
    i = result.next;
  }

  return out.join('\n');
}

function parseFence(lines, start, fence) {
  const marker = fence[1];
  const lang = fence[2];
  const closing = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`);
  const code = [];
  let i = start + 1;

  while (i < lines.length && !closing.test(lines[i])) {
    code.push(lines[i]);
    i += 1;
  }

  const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
  return {
    html: `<pre><code${cls}>${escapeHtml(code.join('\n'))}</code></pre>`,
    next: i + 1 // 닫는 펜스 다음 줄 (닫는 펜스가 없으면 문서 끝)
  };
}

function renderHeading(level, text, ctx) {
  const id = uniqueId(slugify(text), ctx);
  return `<h${level} id="${escapeHtml(id)}">${renderInline(text)}</h${level}>`;
}

// 제목 텍스트로 앵커 id를 만든다. 한글은 그대로 두고 공백은 '-'로 바꾼다.
function slugify(text) {
  const slug = text
    .replace(/[`*_~[\]()!]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug || 'section';
}

function uniqueId(base, ctx) {
  const count = ctx.usedIds.get(base) || 0;
  ctx.usedIds.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

function parseQuote(lines, start, ctx) {
  const inner = [];
  let i = start;

  while (i < lines.length && RE_QUOTE.test(lines[i])) {
    inner.push(lines[i].replace(/^ {0,3}> ?/, ''));
    i += 1;
  }

  return {
    html: `<blockquote>\n${parseBlocks(inner, ctx)}\n</blockquote>`,
    next: i
  };
}

// 표의 한 줄을 셀 목록으로 나눈다. '\|'는 셀 구분자로 보지 않는다.
function splitRow(line) {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);

  const cells = [];
  let current = '';
  for (let k = 0; k < row.length; k += 1) {
    const ch = row[k];
    if (ch === '\\' && row[k + 1] === '|') {
      current += '|';
      k += 1;
    } else if (ch === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function cellAlign(sep) {
  const left = sep.startsWith(':');
  const right = sep.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return '';
}

function parseTable(lines, start) {
  const header = splitRow(lines[start]);
  const aligns = splitRow(lines[start + 1]).map(cellAlign);
  const rows = [];
  let i = start + 2;

  while (i < lines.length && !RE_BLANK.test(lines[i]) && lines[i].includes('|')) {
    rows.push(splitRow(lines[i]));
    i += 1;
  }

  const cell = (tag, text, index) => {
    const align = aligns[index];
    const style = align ? ` style="text-align: ${align}"` : '';
    return `<${tag}${style}>${renderInline(text || '')}</${tag}>`;
  };

  const head = `<tr>${header.map((text, k) => cell('th', text, k)).join('')}</tr>`;
  const body = rows
    .map((row) => `<tr>${header.map((_, k) => cell('td', row[k], k)).join('')}</tr>`)
    .join('\n');

  return {
    html:
      '<div class="table-wrap"><table>\n' +
      `<thead>${head}</thead>\n` +
      (body ? `<tbody>\n${body}\n</tbody>\n` : '') +
      '</table></div>',
    next: i
  };
}

function indentOf(line) {
  return line.match(/^ */)[0].length;
}

// 목록을 파싱한다. 더 깊이 들여쓴 줄은 현재 항목에 속하며, 재귀적으로 블록 파싱한다.
function parseList(lines, start, ctx) {
  const first = lines[start].match(RE_LIST_ITEM);
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items = [];
  let current = null;
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    const item = line.match(RE_LIST_ITEM);

    // 같은 깊이의 새 항목
    if (item && item[1].length <= baseIndent + 1 && /\d/.test(item[2]) === ordered) {
      current = {
        lines: [item[4]],
        contentIndent: item[1].length + item[2].length + item[3].length
      };
      items.push(current);
      i += 1;
      continue;
    }

    // 같은 깊이지만 종류가 다른 항목이면 새 목록으로 넘긴다.
    if (item && item[1].length <= baseIndent + 1) break;

    if (RE_BLANK.test(line)) {
      // 빈 줄 뒤에 이 목록에 속한 줄이 이어지는지 확인한다.
      let j = i + 1;
      while (j < lines.length && RE_BLANK.test(lines[j])) j += 1;
      if (j < lines.length && indentOf(lines[j]) > baseIndent) {
        current.lines.push('');
        i += 1;
        continue;
      }
      break;
    }

    // 더 깊이 들여쓴 줄: 중첩 목록이나 항목의 이어지는 내용
    if (indentOf(line) > baseIndent) {
      const strip = Math.min(indentOf(line), current.contentIndent);
      current.lines.push(line.slice(strip));
      i += 1;
      continue;
    }

    // 들여쓰지 않았지만 바로 앞 줄에 이어 쓴 문장 (게으른 이어쓰기)
    const prev = current.lines[current.lines.length - 1];
    if (prev !== '' && !startsBlock(lines, i)) {
      current.lines.push(line.trim());
      i += 1;
      continue;
    }

    break;
  }

  const tag = ordered ? 'ol' : 'ul';
  const startNum = ordered ? parseInt(first[2], 10) : 1;
  const startAttr = ordered && startNum !== 1 ? ` start="${startNum}"` : '';
  const body = items.map((it) => `<li>${renderListItem(it.lines, ctx)}</li>`).join('\n');

  return { html: `<${tag}${startAttr}>\n${body}\n</${tag}>`, next: i };
}

// 항목의 첫 문장은 인라인으로, 그 뒤의 블록(중첩 목록 등)은 블록으로 렌더링한다.
function renderListItem(itemLines, ctx) {
  let leadEnd = 1;
  while (
    leadEnd < itemLines.length &&
    !RE_BLANK.test(itemLines[leadEnd]) &&
    !startsBlock(itemLines, leadEnd)
  ) {
    leadEnd += 1;
  }

  const lead = renderInline(itemLines.slice(0, leadEnd).join('\n'));
  const rest = itemLines.slice(leadEnd);
  if (rest.every((line) => RE_BLANK.test(line))) return lead;
  return `${lead}\n${parseBlocks(rest, ctx)}`;
}

function parseParagraph(lines, start) {
  const para = [lines[start]];
  let i = start + 1;

  while (i < lines.length && !RE_BLANK.test(lines[i]) && !startsBlock(lines, i)) {
    para.push(lines[i]);
    i += 1;
  }

  const text = para.map((line, k) => (k === 0 ? line.trimStart() : line)).join('\n');
  return { html: `<p>${renderInline(text.trimEnd())}</p>`, next: i };
}

// ---------------------------------------------------------------------------
// 인라인 파싱
// ---------------------------------------------------------------------------

function renderInline(text) {
  const tokens = [];
  // 이미 완성된 HTML 조각을 자리표시자로 빼 두어 이후 규칙이 건드리지 않게 한다.
  const stash = (html) => `\u0000${tokens.push(html) - 1}\u0000`;

  // 1. 원문 전체를 먼저 이스케이프한다.
  let s = escapeHtml(text);

  // 2. 인라인 코드: 안쪽은 다른 문법을 적용하지 않는다.
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, ticks, code) =>
    stash(`<code>${code.replace(/\n/g, ' ').trim()}</code>`)
  );

  // 3. 줄 끝 공백 두 칸 또는 역슬래시는 줄바꿈
  s = s.replace(/(?: {2,}|\\)\n/g, () => stash('<br>') + '\n');

  // 4. 역슬래시 이스케이프: \* 처럼 쓰면 문자 그대로 보여준다.
  s = s.replace(/\\([\\`*_{}[\]()#+\-.!~|])/g, (_, ch) => stash(ch));

  // 5. 이미지 ![대체 텍스트](주소 "제목")
  s = s.replace(
    /!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g,
    (match, alt, url, title) => {
      if (!isSafeUrl(url)) return alt;
      const titleAttr = title ? ` title="${title}"` : '';
      return stash(`<img src="${url}" alt="${alt}"${titleAttr} loading="lazy">`);
    }
  );

  // 6. 링크 [텍스트](주소 "제목") — 텍스트 안의 강조는 아래 단계에서 처리된다.
  s = s.replace(
    /\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g,
    (match, label, url, title) => {
      if (!isSafeUrl(url)) return label;
      return stash(openLink(url, title)) + label + stash('</a>');
    }
  );

  // 7. 자동 링크 <https://example.com>
  s = s.replace(/&lt;(https?:\/\/[^\s<]+?)&gt;/g, (_, url) =>
    stash(`${openLink(url)}${url}</a>`)
  );

  // 8. 강조
  s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^A-Za-z0-9_])__(?=\S)([\s\S]*?\S)__(?![A-Za-z0-9_])/g, '$1<strong>$2</strong>');
  s = s.replace(/\*(?=\S)([\s\S]*?\S)\*/g, '<em>$1</em>');
  // snake_case 같은 단어 안의 밑줄은 기울임으로 보지 않는다.
  s = s.replace(/(^|[^A-Za-z0-9_])_(?=\S)([\s\S]*?\S)_(?![A-Za-z0-9_])/g, '$1<em>$2</em>');
  s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');

  // 9. 자리표시자 복원
  return s.replace(/\u0000(\d+)\u0000/g, (_, n) => tokens[Number(n)]);
}

function openLink(url, title) {
  const titleAttr = title ? ` title="${title}"` : '';
  const external = /^https?:\/\//i.test(url);
  const extra = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${url}"${titleAttr}${extra}>`;
}
