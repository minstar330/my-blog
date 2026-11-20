# Build 서브에이전트 지침 — 콕콕 (pixel-editor)

## 할 일
`apps/pixel-editor/spec.md`(사용자 승인 완료)를 그대로 구현한다. spec이 기준이고, 이 지침과 충돌하면 이 지침의 **수정 범위**가 우선한다.

## 수정 범위
- 만들거나 고칠 수 있는 파일: `apps/pixel-editor/` 안에서 spec 7장에 적힌 파일들(예: `index.html`, `style.css`, `editor.js`, `png.js`, `palette.js`, `storage.js`, `view.js`, `main.js`, `test.html`, `editor.test.js` 등 테스트 파일, `preview.svg`).
- 수정 금지: `apps/pixel-editor/spec.md`, `apps/pixel-editor/agents/`, 그리고 `apps/pixel-editor/` 밖의 모든 파일(블로그 `index.html`, `css/`, `js/`, `posts/`, `CLAUDE.md`, `apps/index.json`, `apps/tile-merge/` 포함 — Embed는 다음 단계에서 따로 한다).
- 임시 스크립트는 저장소 밖(시스템 임시 폴더)에 둔다.
- git 명령은 읽기 전용도 포함해 **전혀 실행하지 않는다**.
- 외부 라이브러리·CDN·npm 패키지를 쓰지 않는다.

## 먼저 읽을 것
1. `apps/pixel-editor/spec.md` 전체. 특히 2장(기능), 4장(PNG), 5장(조작), 6장(디자인·토큰), 8장(인터페이스), 10장(수용 기준), 12장(확정된 결정).
2. `CLAUDE.md`의 코드 스타일·배포 규칙.
3. `apps/tile-merge/index.html`, `apps/tile-merge/style.css`, `apps/tile-merge/storage.js` — 공통 뼈대(테마 인라인 스크립트, `← 블로그로`, `file://` 안내, `localStorage` 래퍼)를 맞추기 위해. 읽기만 한다.
4. `apps/tile-merge/review.md` — 앞 앱의 리뷰에서 나온 문제(확인 대화상자 기본 포커스, 애니메이션 중 패널 겹침)를 이번에는 처음부터 피한다.

## 구현 요점
- 순수 모듈(`editor.js`, `png.js`, `palette.js`)은 DOM·`localStorage`·`window`를 쓰지 않는다. 입력 상태를 바꾸지 않는다.
- 테스트 파일은 DOM 없이 Node에서 실행할 수 있는 ES 모듈로 만들고, `test.html`이 같은 테스트를 화면에 보여준다. 채우기(경계·빈 칸·같은 색), 보간, 되돌리기/다시 하기(50단계 한도, 한 획 = 한 단계), `toRgba` 확대 결과의 픽셀 값(배율별, 알파 0), 자동 저장 데이터 검증(깨진 값)을 테스트한다.
- 캔버스는 고해상도 화면에서 흐려지지 않게(`devicePixelRatio`, 정수 경계), 테마가 바뀌면 다시 그린다.
- 대화상자는 spec 6.4대로 `<dialog>`. 전체 지우기 확인의 기본 포커스는 "취소".
- PNG 저장 후 생성한 blob URL은 해제한다(`URL.revokeObjectURL`), 단 미리보기 이미지가 쓰는 동안은 유지.
- 모든 색은 CSS 변수. 팔레트 스와치 배경처럼 데이터에서 오는 색은 인라인 `style`의 CSS 변수(예: `--swatch-color`)로 넘긴다.

## 직접 확인하고 끝낼 것
- 테스트를 Node로 실행해 모두 통과시킨다.
- spec 6.7의 텍스트 색 쌍 명도 대비를 계산해 4.5:1 미만이면 조정하고 보고한다(spec.md는 고치지 않는다).
- `var`, `/`로 시작하는 경로, 외부 URL(`http`)이 없는지 검색한다(SVG `xmlns`는 예외).
- 브라우저 확인은 선택 사항이다. 한다면 `preview_start`에 `name: "blog"`를 쓰고(`.claude/launch.json`), 바꾼 `localStorage` 값과 화면 크기·색 모드는 되돌린다.

## 보고
한국어로 짧게: 만든 파일 목록, 테스트 결과(통과 수/전체), 바꾼 색 값과 대비 결과, spec과 다르게 한 부분과 이유, 남은 우려.
