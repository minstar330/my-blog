# Review 서브에이전트 지침 — 콕콕 (pixel-editor)

## 할 일
Build 단계에서 만든 `apps/pixel-editor/` 웹앱을 **직접 실행해서** 검증하고, 결과를 `apps/pixel-editor/review.md`에 쓴다. 문제가 있으면 고치고, 고친 뒤 다시 확인한다. 기준은 `apps/pixel-editor/spec.md`(특히 10장 수용 기준, 12장 확정된 결정).

구현을 그대로 믿지 말고, 체크리스트 항목마다 실제로 해 보고 근거(측정값, 콘솔 결과, 스크린샷 관찰)를 남긴다. 형식과 깊이는 `apps/tile-merge/review.md`를 참고한다.

## 수정 범위
- 고칠 수 있는 파일: `apps/pixel-editor/` 안의 구현 파일(`index.html`, `style.css`, `palette.js`, `editor.js`, `png.js`, `storage.js`, `view.js`, `main.js`, `test.html`, `editor.test.js`, `preview.svg`).
- 새로 쓰는 파일: `apps/pixel-editor/review.md`.
- 수정 금지: `spec.md`, `agents/`, `apps/pixel-editor/` 밖의 모든 파일. git 명령은 읽기 전용도 포함해 실행하지 않는다.
- 임시 스크립트는 저장소 밖(시스템 임시 폴더)에 둔다.
- 끝나기 전에 `localStorage`의 `pixel-editor:*` 키와 `theme`(처음 상태로), 화면 크기 에뮬레이션, 색 모드를 원래대로 되돌린다. 직접 연 보조 탭은 닫는다.

## 실행 방법
- 로컬 서버: 브라우저 도구 `preview_start`에 `name: "blog"`(`.claude/launch.json`). 셸로 서버를 띄우지 않는다.
- 앱: `http://localhost:8000/apps/pixel-editor/`, 테스트: `http://localhost:8000/apps/pixel-editor/test.html`. `file://` 탭은 쓰지 않는다.
- 로직 테스트는 Node로도 돌린다.
- 브라우저 창이 숨겨진 상태면 `requestAnimationFrame`·`<dialog>` `close` 이벤트·캔버스 그리기 타이밍이 실제와 다를 수 있다. `tabs_context`로 상태를 확인하고, 숨겨져 있어서 확인하지 못한 항목은 review.md에 그렇게 적는다(그 때문에 생긴 듯한 문제를 코드로 덮지 말고 원인을 구분한다).

## 꼭 확인할 것
1. spec 10장 체크리스트 전부.
2. **PNG 결과물**: 실제 다운로드 경로가 만드는 blob을 다시 읽어(이미지로 디코드 → 캔버스 `getImageData`) 그린 그림과 픽셀 단위로 일치하는지, 네 배율(16·128·256·512) 크기, 투명 칸 알파 0, 기본값 256px, 파일 이름 형식.
3. 375px(모바일)과 데스크톱 폭, 라이트·다크 두 테마. 블로그 `theme` 키 따라가기와 `storage` 이벤트 반영.
4. 포인터 그리기: 합성 Pointer 이벤트로 빠른 드래그 보간, 캔버스 밖으로 나갔다 들어오기, 두 번째 포인터 무시, 채우기·스포이트·지우개.
5. 되돌리기/다시 하기와 자동 저장(새로고침 후 복원, 깨진 저장값, `localStorage` 예외).
6. 대화상자: 저장·전체 지우기 확인의 포커스 이동과 복귀, Esc, 기본 포커스("취소"), 열린 동안 단축키·그리기 차단.
7. 코드 읽기 리뷰: 버그, 이벤트 리스너 중복, blob URL 해제, `ResizeObserver` 처리, 전역 변수, CLAUDE.md 코드 스타일, `/`로 시작하는 경로·외부 URL 없음.

## Build가 남긴 우려 (판단해서 처리)
- 375×812에서 "PNG로 저장" 버튼이 화면보다 약 30px 아래에 있다. 여백·간격 조정으로 첫 화면에 들어오게 할 수 있으면 고친다(터치 대상 44px, 여백 16px 규칙은 지킨다). 무리하면 그대로 두고 이유를 적는다.
- `::backdrop`이 `:root` 변수를 상속하지 않는 구형 브라우저에서 배경이 투명해질 수 있다. 간단한 대비책이 있으면 적용하고, 없으면 위험으로 적는다.
- Build가 남긴 콘솔 `ERR_FILE_NOT_FOUND`는 확인 코드 때문이라고 한다. 새로 연 탭에서 앱 자체가 에러를 내지 않는지 확인한다.

## review.md 형식 (한국어)
1. 요약 — 결론(통과/조건부 통과/실패), 고친 문제 수.
2. 검증 환경.
3. 체크리스트 결과 — spec 10장 항목별 ✅/❌/⚠️ 와 근거 한 줄.
4. 발견한 문제와 수정 — 문제, 원인, 고친 내용(파일:줄), 다시 확인한 결과.
5. 명도 대비 표.
6. 남은 위험·확인 못 한 것.

## 보고
한국어로 짧게: 결론, 고친 문제 목록, 확인 못 한 것.
