# Build 서브에이전트 지침 — 모아 (tile-merge)

## 할 일
`apps/tile-merge/spec.md`(사용자 승인 완료)를 그대로 구현한다. spec이 기준이고, 이 지침과 충돌하면 이 지침의 **수정 범위**가 우선한다.

## 수정 범위
- 만들거나 고칠 수 있는 파일: `apps/tile-merge/` 안의
  `index.html`, `style.css`, `game.js`, `storage.js`, `main.js`, `test.html`, `game.test.js`, `preview.svg`.
- 수정 금지: `apps/tile-merge/spec.md`, `apps/tile-merge/agents/`, 그리고 `apps/tile-merge/` 밖의 모든 파일(블로그 `index.html`, `css/`, `js/`, `posts/`, `CLAUDE.md`, `apps/index.json` 포함 — Embed는 다음 단계에서 따로 한다).
- 임시 스크립트(대비 계산, 테스트 실행용 등)는 저장소 안에 만들지 말고 시스템 임시 폴더에 둔다.
- git 명령(add, commit 등)을 실행하지 않는다.
- 외부 라이브러리·CDN·npm 패키지를 쓰지 않는다.

## 먼저 읽을 것
1. `apps/tile-merge/spec.md` 전체. 특히 2장(규칙·경계 사례 표), 3.1(새 게임 확인 패널), 5장(디자인·토큰), 7장(인터페이스), 9장(수용 기준), "확정된 결정".
2. `CLAUDE.md`의 코드 스타일·배포 규칙.
3. 블로그 `index.html`의 `<head>` 테마 인라인 스크립트와 `js/theme.js` — 테마 키(`theme`)와 선택자 패턴을 맞추기 위해. 읽기만 한다.

## 구현 요점
- `game.js`: DOM·`localStorage`·`Math.random`을 쓰지 않는 순수 함수. 입력 상태를 바꾸지 않는다. spec 7.2의 함수와 반환 형태를 지킨다.
- `game.test.js`: DOM 없이 실행할 수 있는 ES 모듈로 만든다. 예: `export function runTests()`가 `{ name, pass, message }[]`를 돌려주게 하고, `test.html`은 이를 화면에 표시한다. 그래야 Node(`node -e "import('./game.test.js').then(...)"` 등)로도 돌릴 수 있다. spec 2.3 표의 8가지 경계 사례를 네 방향 모두에 대해, 그리고 생성 규칙·움직임 없음·승리·계속하기·게임 오버(꽉 찼지만 합칠 수 있는 경우 포함)를 테스트한다.
- `main.js`: 타일 `id`로 DOM 재사용, 애니메이션 중 입력 1개 대기열, `prefers-reduced-motion` 대응, 패널(승리·게임 오버·새 게임 확인) 포커스 관리, live 영역, 최고 점수 저장.
- `index.html`: viewport meta, `<head>` 테마 인라인 스크립트(`try/catch`), `file://` 안내, `<script type="module" src="main.js">`, `← 블로그로` 링크는 `../../`. 모든 경로 상대 경로.
- `style.css`: 모바일 우선, 색은 전부 CSS 변수, 컴포넌트에 색상값 직접 쓰지 않기, 375px에서 가로 넘침 없음, 터치 대상 44px 이상, `touch-action: none`은 보드에만.
- `preview.svg`: spec 8.2대로 직접 그린 SVG(외부 리소스·폰트 파일 없음, 시스템 폰트 지정만). `viewBox`를 정하고 가로세로 비율은 16:10 정도.
- 원작 2048의 이름·로고·베이지/주황 색·배치를 쓰지 않는다.

## 직접 확인하고 끝낼 것
- 게임 테스트를 Node로 실행해 모두 통과하는지 확인한다(실패하면 고친다).
- spec 5.3의 텍스트·타일 글자/배경 쌍의 명도 대비를 계산해 4.5:1 미만이면 spec 5.3의 원칙대로 색을 조정한다. 바꾼 값은 보고에 적는다(spec.md는 고치지 않는다).
- `var`, `/`로 시작하는 경로, 외부 URL(`http`)이 없는지 검색한다(SVG의 `xmlns`는 예외).
- 브라우저 확인은 다음 Review 단계에서 따로 하므로 필수는 아니다.

## 보고
한국어로 짧게: 만든 파일 목록, 테스트 결과(통과 수/전체), 바꾼 색 값과 대비 계산 결과 요약, spec과 다르게 한 부분과 이유, 남은 우려.
