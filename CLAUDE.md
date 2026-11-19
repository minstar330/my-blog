# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code에게 프로젝트 맥락과 규칙을 알려준다.

## 프로젝트 개요

마크다운(`.md`) 파일로 작성한 글을 읽어서 블로그 웹사이트로 보여주는 정적 사이트.

- **프레임워크·빌드 도구 없음**: 순수 HTML, CSS, JavaScript(ES 모듈)만 사용한다.
- **외부 라이브러리 없음**: React, Vue, Tailwind, marked.js 같은 의존성을 추가하지 않는다. 마크다운 파서도 직접 구현한다. 의존성이 꼭 필요하다고 판단되면 추가하기 전에 먼저 물어본다.
- **npm/package.json 없음**: 브라우저에서 바로 동작해야 한다.
- 디자인 목표: 깔끔하고 읽기 좋은 본문, 다크 모드 지원, 모바일 대응.

## 디렉터리 구조

```
my-blog/
├── index.html          # 단일 진입점 (글 목록 + 글 상세를 모두 이 페이지에서 렌더링)
├── css/
│   └── style.css       # 전체 스타일 (CSS 변수로 라이트/다크 테마 정의)
├── js/
│   ├── main.js         # 앱 시작, 화면 렌더링
│   ├── router.js       # 해시 라우팅, slug 검사
│   ├── markdown.js     # 마크다운 → HTML 파서 (직접 구현)
│   ├── frontmatter.js  # 글 상단 메타데이터 파싱
│   ├── theme.js        # 다크 모드 토글
│   └── utils.js        # escapeHtml, isSafeUrl, formatDate
├── images/             # 글에 넣는 이미지
├── serve.js            # 로컬 확인용 서버 (Node 내장 모듈만 사용, 배포에는 불필요)
└── posts/
    ├── index.json      # 글 목록 매니페스트
    └── *.md            # 블로그 글
```

- 글 안의 이미지·링크 상대 경로는 `posts/`가 아니라 `index.html` 기준이다. 예: `![설명](images/photo.png)`.
- `posts/markdown-guide.md`는 지원하는 모든 문법을 쓴 글이라, 파서를 고친 뒤 회귀 확인용으로 쓴다.

## 동작 방식

1. `index.html`이 로드되면 `js/main.js`가 `posts/index.json`을 `fetch`해서 글 목록을 가져온다.
2. 라우팅은 **해시 기반**으로 한다. 서버 설정 없이 GitHub Pages 같은 정적 호스팅에서도 동작하게 하기 위해서다.
   - `#/` → 글 목록
   - `#/post/<slug>` → `posts/<slug>.md`를 가져와 파싱 후 렌더링
3. 정적 호스팅에서는 폴더 안의 파일 목록을 읽을 수 없으므로, 글을 추가할 때는 `posts/index.json`에도 항목을 추가해야 한다.

### 글 작성 형식

모든 글은 상단에 front matter를 둔다.

```markdown
---
title: 글 제목
date: 2026-11-18
description: 목록에 보일 한두 줄 요약
tags: [javascript, css]
---

본문 내용...
```

`posts/index.json` 항목 형식:

```json
[
  { "slug": "hello-world", "title": "글 제목", "date": "2026-11-18", "description": "요약", "tags": ["javascript"] }
]
```

- `slug`는 파일 이름(확장자 제외)과 같아야 하고, 영문 소문자·숫자·하이픈만 쓴다.
- 목록은 `date` 기준 최신순으로 정렬해서 보여준다. 날짜가 같으면 `index.json`에서 뒤에 있는 글이 위에 온다. 새 글은 배열 끝에 추가한다.

### Obsidian 볼트에서 글 가져오기

"볼트의 블로그 글을 올려줘" 같은 요청은 아래 규칙대로 처리한다.

- **원본 위치**: 사용자 홈의 `~/Documents/Obsidian Vault/40_Blog/` (`_Blog 규칙.md`는 게시글이 아니므로 제외)
- **대상**: `stage`가 `초안`이고 `draft`가 `true`가 아닌 노트만 올린다. `아이디어`, `발행`, `draft: true`인 노트는 건드리지 않는다.
- **볼트 속성 → 블로그 front matter** (비어 있으면 오른쪽 대체값):
  | 블로그 | 볼트 속성 | 비어 있을 때 |
  |---|---|---|
  | `title` | 노트의 `# 제목` | 파일 이름 |
  | `date` | `date` | 올리는 날 |
  | `description` | `description` | 본문의 "핵심 메시지" 한 문장 |
  | `tags` | `blog_tags` | `domain/` 태그 값 (`domain/ai` → `ai`) |
- **블로그 글로 변환** (`posts/<slug>.md`):
  - `slug`는 제목의 뜻을 살린 영문 소문자·하이픈으로 짓고, 기존 글과 겹치면 뒤에 `-2`를 붙인다. 단, 노트의 `url`에 이미 `#/post/<slug>`가 있으면(고쳐서 다시 올리는 글) 그 slug를 그대로 써서 기존 글을 덮어쓴다.
  - 블로그에 내보내지 않는 부분은 뺀다: `# 제목` 줄(제목은 front matter로 감), 핵심 메시지 인용줄, `## 독자`, `## 구성`, `## 재료` 섹션, `## 본문` 제목 줄 자체, `<!-- -->` 주석.
  - Obsidian 전용 문법은 바꾼다: `[[노트|별칭]]`·`[[노트]]` → 별칭이나 노트 이름만 남긴 일반 글자, `![[이미지.png]]` → 이미지를 `images/`로 복사하고 `![](images/이미지.png)`, 콜아웃(`> [!note]`)은 일반 인용문으로.
- **목록 등록**: `posts/index.json` 끝에 추가한 뒤(다시 올리는 글은 기존 항목을 고친다) 브라우저에서 글이 열리는지 확인한다.
- **원본 노트 갱신** (블로그 확인이 끝난 뒤에만): `draft: true`, `stage: 발행`, `platform: my-blog`, `published: <올린 날짜>`, `url: "https://minstar330.github.io/my-blog/#/post/<slug>"`. 다른 속성과 본문은 바꾸지 않는다.
- 볼트 쪽 속성 설명은 `40_Blog/_Blog 규칙.md`, 속성 타입은 `.obsidian/types.json`에 있다. 규칙을 바꾸면 세 곳(이 파일, 규칙 노트, 템플릿 `90_Templates/블로그 글.md`)을 함께 고친다.

### 마크다운 파서 지원 범위

`js/markdown.js`가 최소한 다음 문법을 지원해야 한다.

- 제목(`#` ~ `######`), 문단, 줄바꿈
- 굵게, 기울임, 취소선, 인라인 코드
- 링크, 이미지
- 순서 있는/없는 목록 (중첩 포함)
- 인용문(`>`)
- 코드 블록(```` ``` ````, 언어 표시는 `class="language-xxx"`로 남김)
- 수평선(`---`)
- 표(GFM 스타일)

**보안**: 마크다운 원문의 HTML 특수문자(`<`, `>`, `&`, `"`)는 반드시 이스케이프한 뒤 변환한다. 링크 `href`에 `javascript:` 스킴은 허용하지 않는다. 렌더링 결과를 `innerHTML`에 넣기 때문에 이 규칙을 지켜야 XSS를 막을 수 있다.

## 디자인 규칙

### 가독성

- 본문 폭은 `max-width: 70ch` 안팎으로 제한한다.
- 본문 글자 크기 `1.0625rem`~`1.125rem`, 줄 간격 `1.7` 이상.
- 한글 가독성을 위해 `word-break: keep-all`을 본문에 적용한다.
- 폰트는 시스템 폰트 스택을 기본으로 한다: `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif`.
- 코드 블록은 가로 스크롤(`overflow-x: auto`)로 처리하고, 페이지 전체가 가로로 넘치지 않게 한다.
- 장식은 최소화한다. 여백과 타이포그래피로 위계를 만든다.

### 다크 모드

- 모든 색은 `:root`의 CSS 변수(`--bg`, `--text`, `--text-muted`, `--accent`, `--border`, `--code-bg` 등)로 정의하고, 컴포넌트에서 색상값을 직접 쓰지 않는다.
- 기본값은 OS 설정(`prefers-color-scheme`)을 따른다.
- 헤더의 토글 버튼으로 수동 전환할 수 있고, 선택값은 `localStorage`에 저장한다. 수동 선택은 `<html data-theme="dark|light">`로 적용한다.
- 페이지 로드 시 테마가 깜빡이지 않도록, 저장된 테마를 적용하는 짧은 인라인 스크립트를 `<head>`에 둔다.
- `localStorage` 접근은 `try/catch`로 감싼다 (시크릿 모드 등에서 실패할 수 있음).

### 모바일

- 모바일 우선(mobile-first)으로 작성하고, 넓은 화면은 `min-width` 미디어 쿼리로 확장한다.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 필수.
- 좌우 여백은 최소 `16px`.
- 터치 대상(버튼, 링크)은 최소 `44×44px`.
- 이미지는 `max-width: 100%; height: auto;`.
- 표는 감싸는 요소에 `overflow-x: auto`를 줘서 좁은 화면에서도 깨지지 않게 한다.

### 접근성

- 시맨틱 태그 사용: `<header>`, `<main>`, `<article>`, `<nav>`, `<footer>`.
- 텍스트와 배경의 명도 대비는 WCAG AA(4.5:1) 이상을 두 테마 모두에서 지킨다.
- 테마 토글 버튼에는 `aria-label`을 단다.
- 키보드 포커스 표시(`:focus-visible`)를 지우지 않는다.

## 코드 스타일

- JavaScript는 ES 모듈(`<script type="module">`)로 나누고, 전역 변수를 만들지 않는다.
- `const`/`let`만 사용하고 `var`는 쓰지 않는다.
- 들여쓰기 2칸, 세미콜론 사용, 문자열은 작은따옴표.
- 함수는 작고 한 가지 일만 하게 만든다. 파서 로직은 DOM에 의존하지 않는 순수 함수로 작성한다.
- CSS 클래스 이름은 kebab-case (`post-list`, `post-meta`).
- 주석과 UI 문구는 한국어로 쓴다.

## 로컬 실행

`fetch`와 모듈 스크립트는 `file://`에서 동작하지 않으므로 `index.html`을 더블클릭해서 열면 안 된다. 로컬 서버로 띄운다.

```bash
node serve.js
```

그다음 브라우저에서 `http://localhost:8000`을 연다. 포트를 바꾸려면 `node serve.js 3000`.

- `serve.js`는 Node 내장 모듈만 쓰는 확인용 서버다. 의존성을 추가하지 않는다.
- 이 PC에는 Python이 설치되어 있지 않다.
- 블로그 자체는 `serve.js` 없이 동작해야 한다. 사이트 코드가 서버 기능(API, 리라이트 등)에 기대게 만들지 않는다.

## 배포

- GitHub 저장소 `minstar330/my-blog`의 `main` 브랜치 루트를 GitHub Pages로 그대로 배포한다: https://minstar330.github.io/my-blog/
- `main`에 push하면 1~2분 뒤 자동으로 반영된다. 빌드 단계는 없다.
- 루트의 `.nojekyll`을 지우지 않는다. 없으면 GitHub Pages의 Jekyll이 front matter가 있는 `posts/*.md`를 HTML로 바꿔 버려서 글을 불러올 수 없다.
- 사이트는 `/my-blog/` 하위 경로에서 열리므로, 모든 경로는 지금처럼 상대 경로(`posts/...`, `images/...`)로 쓴다. `/`로 시작하는 절대 경로를 쓰지 않는다.
- 저장소는 공개다. 커밋에 개인 정보(실제 이메일, PC 경로 등)를 넣지 않는다. 커밋 이메일은 GitHub noreply 주소를 쓴다.

## 작업 시 주의사항

- 새 글을 추가하면 `posts/*.md`와 `posts/index.json`을 함께 수정한다.
- UI를 바꾼 뒤에는 라이트/다크 두 테마와 모바일 폭(375px)에서 모두 확인한다.
- 빌드 단계를 도입하거나 파일 구조를 크게 바꾸기 전에 먼저 물어본다.
