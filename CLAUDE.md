## 프로젝트 개요
마크다운 기반 블로그 + 미니 웹앱 포트폴리오. HTML, CSS, JavaScript만 사용.

## 작업 사이클
사용자가 웹앱 주제를 요청하면 다음 순서로 진행한다.
1. Plan — 서브에이전트를 만들어 계획을 작성한다. 어떤 웹앱을 만들지, 파일 구조는 어떻게 할지 정리한다. 작성한 계획은 spec.md로 저장하며, 사용자 승인을 받는다.
2. Build — 서브에이전트를 만들어 구현한다. 웹앱은 /apps/{앱이름}/ 폴더에 독립적으로 만든다. 블로그의 다른 파일을 건드리지 않는다.
3. Review — 별도 서브에이전트를 만들어 검증한다. 브라우저에서 정상 동작하는지, 코드에 문제가 없는지 확인하고 review.md를 작성한다. 문제가 있으면 수정한다.
4. Embed — 블로그 메인 페이지(index.html)에 웹앱 카드를 추가한다. 카드에는 제목, 설명, 미리보기 이미지 또는 iframe을 넣는다. 깃 커밋한다.

## 서브에이전트 규칙
- 서브에이전트에게 작업을 넘길 때 전용 지침 파일(.md)을 만들어 전달한다.
- Build 서브에이전트와 Review 서브에이전트는 반드시 분리한다.
- 서브에이전트는 지침 파일에 명시된 범위만 수정한다.

## 웹앱 규칙
- 모든 웹앱은 /apps/{앱이름}/ 폴더 안에 자체 완결된다.
- 외부 라이브러리 사용을 최소화한다. CDN은 허용한다.
- 모바일에서도 사용할 수 있어야 한다.

## 규칙
- 승인 없이 구현을 시작하지 않는다.
- 막히면 사용자에게 알린다.

## 블로그 본체
- 구조: `index.html`(단일 진입점, 해시 라우팅 `#/`, `#/post/<slug>`), `css/style.css`, `js/`(ES 모듈: main, router, markdown, frontmatter, theme, utils), `images/`, `posts/`.
- 블로그 본체(`index.html`, `css/`, `js/`)는 외부 라이브러리 없이 유지한다. 마크다운 파서는 직접 구현한 `js/markdown.js`를 쓴다. CDN 허용은 `apps/` 안의 웹앱에만 해당한다.
- 마크다운 원문의 HTML 특수문자는 반드시 이스케이프하고, 링크에 `javascript:` 스킴을 허용하지 않는다(XSS 방지).
- 파서를 고친 뒤에는 `posts/markdown-guide.md`로 회귀 확인한다.

## 글 추가
- `posts/<slug>.md`와 `posts/index.json`을 함께 수정한다. 새 항목은 배열 끝에 추가한다.
- `slug`는 파일 이름과 같고 영문 소문자·숫자·하이픈만 쓴다.
- front matter: `title`, `date`(YYYY-MM-DD), `description`, `tags: [a, b]`.
- 글 안의 이미지·링크 상대 경로는 `index.html` 기준이다. 예: `![설명](images/photo.png)`.

## Obsidian 볼트에서 글 가져오기
- 원본: `~/Documents/Obsidian Vault/40_Blog/` (`_Blog 규칙.md` 제외). `stage: 초안`이고 `draft`가 `true`가 아닌 노트만 올린다.
- 속성 대응(비면 대체값): `title`←`# 제목`(파일 이름), `date`←`date`(올리는 날), `description`←`description`(핵심 메시지), `tags`←`blog_tags`(`domain/` 태그 값).
- 노트의 `url`에 이미 `#/post/<slug>`가 있으면 그 slug로 덮어쓴다. 아니면 새 slug를 짓고 겹치면 `-2`를 붙인다.
- 빼는 부분: `# 제목` 줄, 핵심 메시지 인용줄, `## 독자`·`## 구성`·`## 재료` 섹션, `## 본문` 제목 줄, `<!-- -->` 주석.
- 바꾸는 문법: `[[노트|별칭]]`·`[[노트]]` → 일반 글자, `![[이미지.png]]` → `images/`로 복사 후 `![](images/이미지.png)`, 콜아웃 → 일반 인용문.
- 브라우저에서 글이 열리는 것을 확인한 뒤에만 원본 노트를 갱신한다: `draft: true`, `stage: 발행`, `platform: my-blog`, `published: <날짜>`, `url: "https://minstar330.github.io/my-blog/#/post/<slug>"`. 다른 속성과 본문은 바꾸지 않는다.
- 규칙을 바꾸면 이 파일, `40_Blog/_Blog 규칙.md`, `90_Templates/블로그 글.md`를 함께 고친다.

## 디자인
- 모든 색은 `:root`의 CSS 변수로 정의하고 다크 모드(`prefers-color-scheme` + `<html data-theme>`)를 지원한다. `localStorage` 접근은 `try/catch`로 감싼다.
- 모바일 우선, 좌우 여백 16px 이상, 터치 대상 44×44px 이상, 명도 대비 WCAG AA 이상.
- UI를 바꾼 뒤에는 라이트/다크 두 테마와 375px 폭에서 확인한다.

## 코드 스타일
- ES 모듈, `const`/`let`만 사용, 들여쓰기 2칸, 세미콜론, 작은따옴표. CSS 클래스는 kebab-case. 주석과 UI 문구는 한국어.

## 로컬 실행
- `node serve.js` 후 `http://localhost:8000`(포트 변경: `node serve.js 3000`). `file://`로 열면 동작하지 않는다.
- 이 PC에는 Python이 없다. `serve.js`는 Node 내장 모듈만 쓰고, 사이트는 서버 기능에 기대지 않는다.

## 배포
- `minstar330/my-blog`의 `main` 브랜치 루트를 GitHub Pages로 배포한다: https://minstar330.github.io/my-blog/ (push 후 1~2분 뒤 반영, 빌드 단계 없음).
- 루트의 `.nojekyll`을 지우지 않는다. 없으면 `posts/*.md`를 불러올 수 없다.
- 사이트가 `/my-blog/` 하위에서 열리므로 모든 경로는 상대 경로로 쓴다. `/`로 시작하는 절대 경로 금지(웹앱도 마찬가지).
- 공개 저장소다. 커밋에 개인 정보(실제 이메일, PC 경로 등)를 넣지 않고, 커밋 이메일은 GitHub noreply 주소를 쓴다.
- 빌드 단계를 도입하거나 파일 구조를 크게 바꾸기 전에 먼저 물어본다.
