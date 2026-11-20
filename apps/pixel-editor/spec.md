# 콕콕 (Kokkok) — 16×16 픽셀 아트 에디터 · 계획서

> 상태: **승인 완료(2026-11-20)**. 12장의 확정된 결정을 따른다.
> 폴더: `apps/pixel-editor/` (고정)

---

## 1. 개요

| 항목 | 내용 |
|---|---|
| 앱 이름 | **콕콕** |
| 영문 부제 | *Kokkok — 16×16 Pixel Art* |
| 이름 뜻 | 손끝으로 점을 "콕콕" 찍어 그린다는 뜻. |
| 한 줄 설명 | 16×16 칸에 점을 찍어 도트 그림을 그리고, 테두리가 흐려지지 않는 PNG로 저장하는 그림판. |
| 블로그 카드 문구 | **제목**: 콕콕 — 16×16 픽셀 아트 / **설명**: 16×16 칸에 점을 콕콕 찍어 그림을 그리고 PNG로 저장해요. 마우스·터치·키보드로 그릴 수 있고, 그리던 그림은 자동으로 남아요. |
| 페이지 `<title>` | `콕콕 — 16×16 픽셀 아트` |

격자 크기는 **16×16 고정**이다. 로직 함수는 `size` 인자를 받아 두지만(테스트·확장용) UI는 16만 쓴다.

---

## 2. 기능

### 2.1 넣는 것

| 기능 | 동작 | 단축키 |
|---|---|---|
| **펜** | 누른 칸을 현재 색으로 칠한다. 누른 채 끌면 이어 그린다(5.2 보간). | `B` |
| **지우개** | 누른 칸을 빈 칸(투명)으로 만든다. 끌어서 이어 지울 수 있다. | `E` |
| **채우기** | 누른 칸과 **같은 색으로 상하좌우(4방향) 이어진 영역**을 현재 색으로 바꾼다. 빈 칸 영역도 채울 수 있다. 끌기는 무시(누른 순간 한 번만). 이미 같은 색이면 아무 일도 하지 않는다(이력에도 남기지 않음). | `F` |
| **스포이트** | 누른 칸의 색을 현재 색으로 고른 뒤 **펜으로 돌아간다**. 빈 칸을 찍으면 **지우개를 고른다**. 그림은 바꾸지 않는다. | `I` |
| **되돌리기 / 다시 하기** | 한 번의 획(누름 → 뗌), 한 번의 채우기, 전체 지우기가 각각 한 단계. 최대 **50단계**. 그림이 실제로 바뀐 동작만 기록. 새 동작을 하면 다시 하기 목록은 비운다. | `Ctrl/⌘+Z` / `Ctrl/⌘+Shift+Z`, `Ctrl+Y` |
| **격자선 표시** | 켜기/끄기 토글(`aria-pressed`). 기본값 켬. PNG에는 격자선이 들어가지 않는다. | `G` |
| **전체 지우기** | 확인 대화상자(6.4)에서 "지우기"를 골라야 지운다. 되돌리기로 복구 가능(대화상자 문구에 안내). 그림이 비어 있으면 버튼을 `disabled`로 둔다. | 없음(실수 방지) |
| **PNG 저장** | 저장 대화상자(4장)를 연다. | 없음 |
| **자동 저장** | 그림을 `localStorage`에 저장해 **새로고침·재방문 후에도 유지**한다. 저장 시점: 획이 끝날 때, 채우기·전체 지우기·되돌리기·다시 하기 직후. 획 도중(칸마다)에는 저장하지 않는다. 되돌리기 이력은 저장하지 않는다(새로고침하면 이력은 비어 있음). | — |

- 도구 선택 규칙: 지우개·스포이트 상태에서 **팔레트 색을 누르면 펜으로 바뀐다**(색을 골랐다는 건 칠하겠다는 뜻). 채우기 상태에서는 채우기를 유지한다.
- 단일 문자 단축키(`B`, `E`, `F`, `I`, `G`)는 **포커스가 에디터 영역(`.editor`: 캔버스·도구·팔레트) 안에 있을 때만** 동작한다. `Ctrl`/`Alt`/`Meta`가 눌려 있거나, 포커스가 `<input>` 안이거나, 대화상자가 열려 있으면 무시한다. (WCAG 2.1.4 문자 단축키: 해당 구성 요소에 포커스가 있을 때만 활성화)
- `Ctrl/⌘+Z` 계열은 대화상자가 닫혀 있으면 페이지 어디서든 동작하고 `preventDefault()`한다.

### 2.2 넣지 않는 것
- 선·사각형·원 도구, 대칭(거울) 그리기, 선택·이동·복사 — 도구 수와 상태가 늘어난다.
- 확대/축소·화면 이동 — 16×16에서는 캔버스를 화면 폭만큼 키우는 것으로 충분하다(열린 질문 5).
- 레이어, 애니메이션 프레임, 격자 크기 변경.
- 그림 여러 장 저장·갤러리, PNG 불러오기.
- 투명도(알파) 있는 색 — 칸은 "불투명한 색" 또는 "빈 칸" 둘 중 하나.

---

## 3. 팔레트

### 3.1 기본 색 16개 (직접 구성)

밝은 무채색 4개 → 따뜻한 색 → 차가운 색 → 피부·흙 계열 순서. 기존 유명 팔레트(PICO-8, Sweetie 16, DB16 등)를 옮기지 않고 새로 골랐다.

| # | 이름(레이블) | HEX |
|---|---|---|
| 1 | 검정 | `#14161c` |
| 2 | 짙은 회색 | `#4a5060` |
| 3 | 연회색 | `#a7adba` |
| 4 | 흰색 | `#ffffff` |
| 5 | 빨강 | `#e0393e` |
| 6 | 주황 | `#f28c28` |
| 7 | 노랑 | `#f7d038` |
| 8 | 연두 | `#8fd14f` |
| 9 | 초록 | `#2e9e5b` |
| 10 | 청록 | `#1fb5a8` |
| 11 | 하늘 | `#5ab8f0` |
| 12 | 파랑 | `#2f5fd0` |
| 13 | 보라 | `#6a4bc4` |
| 14 | 분홍 | `#f07aa8` |
| 15 | 살구 | `#f5c6a0` |
| 16 | 갈색 | `#8a5a3c` |

- 색은 **그림 데이터**이므로 테마와 무관하게 고정이다. `palette.js`에 `{ name, hex }` 배열로 두고, 스와치 배경은 JS에서 `style.backgroundColor`로 넣는다. (UI 색은 모두 CSS 변수로 쓰는 규칙은 그대로 지킨다. 팔레트·그림 색은 "데이터"라서 예외로 본다는 점을 코드 주석으로 남긴다.)
- 기본 현재 색: **검정**.

### 3.2 사용자 지정 색
- 팔레트 끝에 **"직접 고르기" 칸 1개**를 둔다: `<label>`로 감싼 `<input type="color">`를 44×44px 스와치처럼 보이게 꾸민다.
- 색을 고르면(`input` 이벤트) 그 색이 사용자 칸에 남고 현재 색이 된다. 이 칸을 다시 누르면 브라우저 색 선택기가 열린다.
- 사용자 색은 1개만 기억한다(설정에 저장). 다른 사용자 색이 또 필요하면 그림에서 **스포이트**로 다시 집을 수 있다(열린 질문 3).
- 레이블: `aria-label="직접 고른 색 #12ab34"`(값에 따라 갱신). 아직 고르지 않았으면 기본값 `#ff6f61`로 시작하고 "직접 고르기"로 읽힌다.
- `<input type="color">`가 없는 환경(드묾)은 `input.type !== 'color'`로 확인해 칸을 숨긴다.

### 3.3 현재 색 표시
- 도구 줄 왼쪽에 **현재 색 칩**(28px 정사각 + 글자): "현재 색 **빨강**" / 사용자 색이면 "현재 색 **#12ab34**". 지우개를 고르면 칩이 체크무늬로 바뀌고 "빈 칸(지우개)".
- 선택된 팔레트 스와치에는 두 겹 링(안쪽 `--bg` 2px, 바깥 `--text` 2px)과 `aria-pressed="true"`. 링은 배경 대비 3:1 이상(WCAG 1.4.11).
- 흰색·검정 스와치가 배경에 묻히지 않도록 모든 스와치에 `1px solid var(--swatch-border)` 테두리.

### 3.4 투명(빈 칸)
- 데이터에서 `null`. 새 그림은 모두 빈 칸.
- 화면에서는 **체크무늬**로 보인다. 한 칸을 2×2 작은 사각형으로 나눠 `--checker-a`/`--checker-b`를 번갈아 칠한다(칸 경계와 체크 경계가 맞아 어디가 한 칸인지 헷갈리지 않음).
- PNG에서는 알파 0(완전 투명)으로 나간다.

---

## 4. PNG 저장

### 4.1 저장 대화상자
"PNG로 저장" 버튼 → `<dialog>`(6.4) 열림:

```
┌ PNG로 저장 ───────────────────────┐
│ 크기                                │
│ (○) 16px  (○) 128px                 │  ← 라디오 4개, 각 44px 높이
│ (●) 256px (○) 512px                 │
│ ┌──────────────┐                    │
│ │  미리보기     │  160×160, 체크무늬 위 │
│ └──────────────┘                    │
│ 다운로드가 안 되면 이미지를 길게 눌러   │
│ (PC는 오른쪽 클릭) 저장하세요.         │
│ [ 다운로드 ]  [ 닫기 ]                │
└─────────────────────────────────────┘
```

### 4.2 출력 크기
- 배율 선택: **1배(16px), 8배(128px), 16배(256px), 32배(512px)**. 기본값 **16배 = 256×256px**(열린 질문 2). 마지막으로 고른 배율은 설정에 저장.
- 라디오 레이블은 "256px (16배)"처럼 결과 크기를 먼저 보여준다.

### 4.3 흐려지지 않게 만드는 방법
- 순수 함수 `toRgba(pixels, size, scale)`가 **확대된 RGBA 바이트 배열을 직접 만든다**(각 칸을 `scale×scale` 블록으로 복사). 보간이 끼어들 틈이 없다.
- `main.js`는 그 결과로 `new ImageData(data, w, h)` → 화면에 붙이지 않은 `<canvas>`(크기 w×h)에 `putImageData` → `canvas.toBlob(callback, 'image/png')`.
- `drawImage`로 키우지 않는다(`imageSmoothingEnabled` 설정에 기대지 않음).
- `toBlob`이 없으면 `toDataURL('image/png')`로 대체한다.

### 4.4 투명 배경
- 빈 칸 = `[0, 0, 0, 0]`, 색 칸 = `[r, g, b, 255]`. 배경을 칠하지 않는다. 격자선·체크무늬·커서는 PNG에 들어가지 않는다.
- 그림이 비어 있어도 저장은 된다(완전 투명 PNG). 대화상자에 "빈 그림이에요. 투명한 이미지로 저장돼요." 한 줄을 보여준다.

### 4.5 파일 이름
- `kokkok-YYYYMMDD-HHMMSS-<폭>px.png` (저장하는 순간의 **기기 현지 시간**). 예: `kokkok-20261120-153204-256px.png`.
- 순수 함수 `makeFileName(date, width)`로 만든다(테스트에서 고정 날짜 주입).

### 4.6 다운로드와 모바일 대안
- 대화상자를 열 때와 배율을 바꿀 때 PNG Blob을 새로 만들고 `URL.createObjectURL`로 주소를 만든다. 이전 주소는 `revokeObjectURL`. 대화상자를 닫을 때도 해제한다.
- 미리보기 `<img>`의 `src`가 **실제 저장될 PNG 그 자체**다. CSS로 160×160에 `image-rendering: pixelated`로 보여주되 파일은 원래 크기다.
- "다운로드" 버튼: 임시 `<a href="blob:..." download="파일이름">`을 만들어 `click()`. (iOS Safari 13 이상은 `download` 속성을 지원해 "다운로드" 확인 창이 뜬다.)
- **대안**: 카카오톡 등 앱 안 브라우저나 일부 iOS 환경처럼 다운로드가 막히면, 미리보기 이미지를 **길게 눌러 "사진에 저장"**할 수 있다. 이 안내 문구를 항상 보여준다. 미리보기 이미지에는 `-webkit-touch-callout`을 막지 않는다(캔버스와 반대).
- Web Share API(공유 시트)는 쓰지 않는다(범위 밖).

---

## 5. 조작

### 5.1 포인터(마우스·터치·펜): Pointer Events
- 캔버스에서 `pointerdown` / `pointermove` / `pointerup` / `pointercancel` / `lostpointercapture`를 받는다.
- `pointerdown`: 주 버튼(`event.button === 0`, 터치·펜 포함)만 처리. `setPointerCapture`로 캔버스 밖으로 나가도 획을 이어 받는다. **첫 포인터만 추적**하고, 획 도중 들어온 다른 포인터는 무시.
- 좌표 → 칸: `x = Math.floor((clientX - rect.left) / rect.width * 16)`, `y`도 같은 방식. 0~15 밖이면 그 점은 칠하지 않는다(획은 계속).
- 펜·지우개: `pointerdown`에서 획 시작(획 시작 전 그림을 이력용으로 기억) → 칸 칠함 → `pointermove`마다 이어 칠함 → `pointerup`에서 획 끝(바뀌었으면 이력 기록·자동 저장).
- `pointercancel`·`lostpointercapture`: 그때까지 칠한 내용은 **남기고** 획을 끝낸다(이력 기록). 사용자가 본 그대로를 지키기 위해.
- 채우기·스포이트: `pointerdown`에서 한 번만 실행.
- 화면 갱신은 `requestAnimationFrame`으로 한 프레임에 한 번만 다시 그린다.

### 5.2 칸 건너뜀 방지(보간)
- 빠르게 끌면 `pointermove` 사이에 칸이 비므로, **직전 칸과 지금 칸을 브레젠험 직선으로 잇는 모든 칸**을 칠한다(`lineCells`, 양 끝 포함).
- `event.getCoalescedEvents()`가 있으면 합쳐진 이벤트들을 차례로 같은 방식으로 처리한다(곡선이 덜 각지게). 없으면 `pointermove` 하나만.
- 같은 칸 안에서 움직이면 아무것도 하지 않는다.

### 5.3 페이지 스크롤·확대 막기
- 캔버스에 `touch-action: none`(그리는 중 스크롤·핀치 확대·더블탭 확대 없음). 캔버스 밖에서는 평소대로 스크롤된다.
- 캔버스에 `user-select: none`, `-webkit-touch-callout: none`, `contextmenu` 이벤트 `preventDefault()`(길게 누르면 뜨는 메뉴 방지).

### 5.4 키보드
캔버스는 `tabindex="0"`로 포커스를 받는다. 포커스가 있을 때:

| 키 | 동작 |
|---|---|
| 방향키 | 키보드 커서를 한 칸 이동(가장자리에서 멈춤). `preventDefault()`로 페이지 스크롤 막음. |
| `Enter` | 커서 칸에 현재 도구를 한 번 적용(펜·지우개·채우기·스포이트 모두). 한 번 = 이력 한 단계. |
| `Space` | 누르는 순간 커서 칸에 펜·지우개 적용 + 획 시작. **누른 채 방향키로 움직이면 지나간 칸을 이어 칠한다.** 떼면 획 끝(이력 한 단계). 키 반복(`event.repeat`)은 무시. 채우기·스포이트에서는 `Enter`와 같다. |
| `Home` / `End` | 커서를 그 행의 처음/끝 칸으로. |

- 커서 시작 위치: 왼쪽 위 (0, 0). 위치는 다시 포커스해도 유지.
- 커서는 캔버스가 포커스를 가졌고 마지막 입력이 키보드일 때만 그린다. 모양: 칸 테두리에 **두 겹 링**(안쪽 `--cursor-inner`, 바깥 `--cursor-outer`) → 어떤 칸 색 위에서도 보인다.
- 커서 이동마다 live 영역에 "5열 3행, 빨강"(빈 칸이면 "빈 칸", 사용자 색이면 HEX)을 알린다.
- 마우스·펜이 캔버스 위에 떠 있을 때(`pointerType !== 'touch'`)는 가리키는 칸에 얇은 미리보기 테두리를 그린다. 터치는 끌고 있는 동안 지금 칸에 그린다.

### 5.5 그 밖의 단축키
2.1 표 참고(`B` `E` `F` `I` `G`, `Ctrl/⌘+Z`, `Ctrl/⌘+Shift+Z`, `Ctrl+Y`). `Esc`는 열린 대화상자를 닫는다(`<dialog>` 기본 동작).

---

## 6. 화면 구성·디자인

### 6.1 캔버스 방식: **`<canvas>` 하나 (추천)**
- **DOM 격자(256개 버튼)를 쓰지 않는 이유**: 버튼 256개가 Tab 순서를 차지하고, 드래그 중 `elementFromPoint`로 칸을 찾아야 하며, 체크무늬·격자선·커서를 칸마다 CSS로 겹쳐야 한다. 키보드 탐색도 256개 포커스 대상보다 "캔버스 하나 + 방향키 커서"가 단순하다.
- **Canvas를 쓰는 이유**: 좌표 → 칸 계산이 한 줄, 다시 그리기가 사각형 256개 수준이라 가볍고, 체크무늬·격자선·커서를 한곳에서 그린다.
- 렌더링 규칙:
  - CSS 크기: 폭 `min(100%, 32rem)`, `aspect-ratio: 1`. `ResizeObserver`로 CSS 크기를 재서 `canvas.width = canvas.height = Math.round(cssSize * devicePixelRatio)`.
  - 칸 경계는 `edge(i) = Math.round(i * canvas.width / 16)`로 정수 픽셀에 맞춘다(칸마다 폭이 1px 다를 수는 있지만 번짐 없음).
  - 순서: 체크무늬(빈 칸) → 색 칸 → 격자선(켜져 있을 때, 기기 픽셀 1px 두께의 `fillRect`) → 호버/커서 테두리.
  - 캔버스는 CSS 변수를 직접 못 쓰므로, 그릴 때 `getComputedStyle(document.documentElement)`로 `--checker-a`, `--checker-b`, `--grid-line`, `--cursor-inner`, `--cursor-outer`, `--hover-line`을 읽는다. **테마가 바뀌면(블로그 `storage` 이벤트, `matchMedia('(prefers-color-scheme: dark)')`의 `change`) 다시 그린다.**
- 캔버스 접근성: `role="application"`, `aria-roledescription="그림판"`, `aria-label="16×16 그림판"`, `aria-describedby`로 조작 도움말(6.5) 연결. `role="application"`은 방향키·Space를 앱이 직접 쓰기 때문에 고른다.

### 6.2 16×16 한 칸이 44px보다 작은 문제
- 375px 폭에서 캔버스는 343px → **한 칸 약 21px**. 칸 하나를 44px로 만들면 704px가 필요해 한 화면에 안 들어간다.
- 결정: **44×44px 규칙은 독립된 조작 요소(버튼·링크·스와치·라디오)에 적용하고, 캔버스는 343×343px짜리 하나의 그리기 면으로 본다.** 각 칸은 따로 누르는 컨트롤이 아니다. (WCAG 2.5.8은 24px 기준이며 그리기 면처럼 위치 자체가 의미인 경우를 예외로 둔다.)
- 보완책:
  1. 캔버스를 가능한 한 크게: 좁은 화면에서는 좌우 여백 16px만 남기고 꽉 채움, 넓은 화면은 최대 512px(한 칸 32px).
  2. 누르는 순간 바로 칠해져 결과가 즉시 보이고, 끌고 있는 동안 지금 칸 테두리가 보인다.
  3. 잘못 찍으면 **되돌리기** 한 번으로 그 획 전체가 취소된다.
  4. 정밀하게 찍고 싶으면 키보드 커서(외부 키보드)도 쓸 수 있다.
- 확대 모드는 넣지 않는다(열린 질문 5).

### 6.3 레이아웃 스케치

**375px (좌우 여백 16px, 위에서 아래로 한 줄):**

```
┌───────────────────────────────────────┐
│ ← 블로그로                              │  ← 44px 높이 링크 (../../)
│ 콕콕  16×16 Pixel Art                   │  ← h1 + 부제 (한 줄, 좁으면 줄바꿈)
│ ┌───────────────────────────────────┐ │
│ │                                   │ │
│ │      캔버스 343×343 (한 칸 21px)    │ │
│ │                                   │ │
│ └───────────────────────────────────┘ │
│ ■ 현재 색 빨강                          │  ← 현재 색 칩
│ [ 펜 ][지우개][채우기][스포이트]          │  ← 도구 4개 (각 44px 이상, 4등분)
│ [되돌리기][다시하기][ 격자 ][전체지우기]    │  ← 동작 4개
│ ■ ■ ■ ■ ■ ■                            │
│ ■ ■ ■ ■ ■ ■                            │  ← 팔레트 6열 × 3줄 (16색 + 직접 고르기)
│ ■ ■ ■ ■ ■ ◐                            │
│ [         PNG로 저장         ]          │  ← 전체 폭, 44px 이상
└───────────────────────────────────────┘
  footer: 조작 도움말 한두 줄 (text-muted)
```

- 375×812 화면에서 캔버스·도구·팔레트가 스크롤 없이 대부분 보이도록 헤더를 한 줄로 줄인다(제목과 부제를 같은 줄, `flex-wrap`).
- 팔레트: `grid-template-columns: repeat(auto-fill, minmax(44px, 1fr))`, 간격 6px → 343px에서 6열. 스와치는 정사각(`aspect-ratio: 1`).
- 도구·동작 버튼: 4열 그리드, 글자 `0.875rem`, 짧은 한국어 글자 + 장식용 인라인 SVG 아이콘(`aria-hidden="true"`). 아이콘은 직접 그린 단순 도형.

**넓은 화면 (`min-width: 48rem`):**

```
┌──────────────────────────────────────────────────────────┐
│ ← 블로그로                                                  │
│ 콕콕  16×16 Pixel Art                                       │
│ ┌──────────────────────────┐  ■ 현재 색 빨강                 │
│ │                          │  [펜][지우개][채우기][스포이트]    │
│ │   캔버스 최대 512×512      │  [되돌리기][다시하기][격자][지우기] │
│ │   (한 칸 32px)            │  팔레트 6열                     │
│ │                          │  [ PNG로 저장 ]                 │
│ └──────────────────────────┘                                 │
└──────────────────────────────────────────────────────────┘
```

- 전체 컨테이너 `max-width: 56rem`, 가운데 정렬. 2열 그리드: `minmax(0, 32rem)` + `minmax(16rem, 1fr)`. 오른쪽 패널은 위쪽 정렬.
- 시맨틱 태그: `<header>`(뒤로 가기·제목), `<main>`(에디터: 캔버스 + 도구 + 팔레트 + 저장), `<footer>`(도움말). 도구 묶음은 `role="toolbar"` + `aria-label="도구"`, 팔레트는 `role="group"` + `aria-label="팔레트"`.
- 375px에서 가로 스크롤 없음. 모든 버튼·링크·스와치·라디오 44×44px 이상.

### 6.4 대화상자
- **네이티브 `<dialog>` + `showModal()`**을 쓴다. tile-merge는 보드 위 패널이었지만, 여기서는 저장 대화상자 내용(라디오·미리보기·버튼)이 캔버스보다 크고, 대화상자가 열린 동안 뒤쪽 캔버스·단축키가 동작하면 안 되므로 모달이 맞다. 포커스 가두기·`Esc`·배경 비활성을 브라우저가 처리한다(Safari 15.4 이상).
- 두 가지:
  - **전체 지우기 확인**: 제목 "그림을 모두 지울까요?", 설명 "되돌리기로 다시 살릴 수 있어요.", 버튼 **"취소"**(기본 포커스) / **"지우기"**(`--danger` 색). 기본 포커스를 "취소"에 두는 건 tile-merge 리뷰에서 찾은 문제(Enter 두 번에 바로 실행됨)를 처음부터 막기 위해서다.
  - **PNG 저장**(4.1): 기본 포커스는 선택된 배율 라디오.
- 닫히면 연 버튼으로 포커스를 돌려준다. 폭 `min(100vw - 32px, 24rem)`, 내용이 길면 대화상자 안에서 세로 스크롤. `::backdrop`은 `--overlay-bg`.

### 6.5 도움말 문구
- footer: "누르거나 끌어서 칠해요. 키보드: 캔버스에서 방향키로 이동, Space를 누른 채 움직이면 칠하기, Enter로 한 칸."
- 단축키 목록은 도구 버튼의 `title`과 `aria-keyshortcuts`(`B` 등)로 알린다.

### 6.6 테마 결정 (tile-merge와 같음)
- 앱 자체 CSS 변수로 라이트/다크를 정의한다. 선택자 패턴:
  `:root`(라이트) → `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) {...} }` → `:root[data-theme='dark'] {...}`.
- **블로그 테마를 따른다(읽기 전용)**: `<head>` 인라인 스크립트가 블로그의 `localStorage` 키 `theme`(`dark`|`light`)를 `try/catch` 안에서 읽어 `<html data-theme>`에 적용. 값이 없거나 실패하면 OS 설정.
  - `storage` 이벤트로 다른 탭에서 바꾼 테마를 바로 반영(`event.key === 'theme'` 또는 `null`) + 캔버스 다시 그리기.
  - 앱은 `theme` 키에 **쓰지 않는다**. 앱 안에 테마 토글 없음. `window.parent`/`window.top`에 접근하지 않는다.

### 6.7 색 토큰

화면 공통 토큰은 포트폴리오 통일감을 위해 **tile-merge와 같은 값**을 쓴다(대비는 tile-merge `review.md`에서 이미 확인됨).

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--bg` | `#f4f6fb` | `#0f1220` | 페이지 배경 |
| `--surface` | `#ffffff` | `#181c2e` | 버튼(보조)·대화상자 배경 |
| `--text` | `#1b2030` | `#e6e9f2` | 본문 글자, 선택 링 바깥 |
| `--text-muted` | `#545c70` | `#9aa3b8` | 부제·도움말 |
| `--border` | `#d9dee9` | `#2a3048` | 버튼·캔버스 테두리 |
| `--accent` | `#127a6c` | `#5fd4c0` | 선택된 도구 배경, 주 버튼, 포커스 링 |
| `--accent-text` | `#ffffff` | `#0f1220` | 주 버튼·선택된 도구 글자 |
| `--accent-hover` | `#0d5f54` | `#8be3d4` | 주 버튼 hover |
| `--danger` | `#b3261e` | `#ff8a80` | "지우기" 버튼 배경 |
| `--danger-text` | `#ffffff` | `#0f1220` | "지우기" 버튼 글자 |
| `--overlay-bg` | `rgb(244 246 251 / 0.88)` | `rgb(15 18 32 / 0.88)` | 대화상자 `::backdrop` |
| `--swatch-border` | `#7a8195` | `#6a7290` | 스와치·현재 색 칩 테두리 |

캔버스 전용(JS가 읽음):

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--checker-a` | `#ffffff` | `#2a2f45` | 빈 칸 체크무늬 밝은 칸 |
| `--checker-b` | `#e3e7ef` | `#22263a` | 빈 칸 체크무늬 어두운 칸 |
| `--grid-line` | `rgb(27 32 48 / 0.18)` | `rgb(230 233 242 / 0.16)` | 격자선 |
| `--hover-line` | `rgb(27 32 48 / 0.55)` | `rgb(230 233 242 / 0.6)` | 마우스 호버·터치 중 칸 테두리 |
| `--cursor-inner` | `#ffffff` | `#0f1220` | 키보드 커서 안쪽 링 |
| `--cursor-outer` | `#1b2030` | `#e6e9f2` | 키보드 커서 바깥 링 |

- 컴포넌트 CSS에서 색상값을 직접 쓰지 않는다(팔레트·그림 색은 3.1의 예외).
- **명도 대비**: 글자 쌍(`--text`·`--text-muted`/`--bg`·`--surface`, `--accent-text`/`--accent`, `--danger-text`/`--danger`)은 4.5:1 이상, 선택 링·스와치 테두리·캔버스 테두리·커서 같은 비텍스트 표시는 3:1 이상(WCAG 1.4.11)을 목표로 했다. Build 단계에서 다시 계산해 부족하면 조정하고, Review는 계산 결과를 `review.md`에 기록한다.

### 6.8 타이포그래피·움직임
- 폰트: 블로그와 같은 시스템 폰트 스택. HEX 표시는 `font-variant-numeric: tabular-nums`.
- 애니메이션은 거의 없다(버튼 배경색 150ms 전환 정도). `prefers-reduced-motion: reduce`이면 전환도 끈다.

### 6.9 상태 알림 (`aria-live="polite"`, 시각적으로 숨김)
- 도구 변경("채우기"), 색 변경("현재 색 빨강"), 되돌리기·다시 하기("되돌렸어요" / "다시 했어요" / "더 되돌릴 게 없어요"), 전체 지우기("그림을 지웠어요"), 다운로드("kokkok-…png 저장을 시작했어요"), 키보드 커서 위치(5.4).
- 포인터로 칠할 때는 칸마다 알리지 않는다.
- 되돌리기·다시 하기 버튼은 할 게 없으면 `disabled`.

---

## 7. 파일 구조

```
apps/pixel-editor/
├── index.html      # 앱 페이지. viewport meta, 테마 인라인 스크립트, data: SVG 파비콘, 마크업 뼈대,
│                   #   file:// 안내(일반 스크립트), <script type="module" src="main.js">
├── style.css       # :root 라이트/다크 토큰, 레이아웃(모바일 우선 + 48rem), 버튼·스와치·대화상자, reduced-motion,
│                   #   test.html용 스타일
├── palette.js      # 기본 팔레트 데이터 { name, hex }[]와 색 이름 찾기 (순수)
├── editor.js       # 그림 데이터·도구·이력·직렬화 순수 로직 (DOM·localStorage 사용 금지)
├── png.js          # PNG용 RGBA 변환, 배율 목록, 파일 이름 (순수)
├── storage.js      # 그림·설정 읽기/쓰기 (try/catch로 감싼 localStorage 래퍼, 검증은 editor.js 함수 사용)
├── view.js         # 캔버스 그리기(체크무늬·칸·격자선·커서), 크기 맞춤, 좌표 → 칸 변환 (DOM)
├── main.js         # 상태 보관, 포인터·키보드 입력, 도구·팔레트·대화상자 UI, PNG Blob 생성·다운로드, live 영역
├── test.html       # 브라우저에서 editor.test.js를 실행해 결과를 보여주는 페이지 (tile-merge와 같은 형태)
├── editor.test.js  # editor.js·png.js·palette.js 단위 테스트, runTests() → { name, pass, message }[]
├── preview.svg     # 블로그 카드 미리보기 (640×400, 직접 그린 SVG)
├── agents/         # 서브에이전트 지침 (이미 있음)
└── spec.md         # 이 문서
```

- 모든 경로는 상대 경로. 블로그로 돌아가는 링크는 `../../`. `/`로 시작하는 경로 금지.
- 외부 라이브러리·CDN 없음. PNG 인코딩은 브라우저 `canvas.toBlob`.
- 파비콘: `data:` SVG로 4×4 도트 하트(빨강 `#e0393e`).
- `test.html`은 배포돼도 무해하지만 블로그 카드에서 링크하지 않는다.
- Node 실행(저장소 루트에서):
  `node --input-type=module -e "import('./apps/pixel-editor/editor.test.js').then(m => { const r = m.runTests(); console.log(r.filter(x => !x.pass)); console.log(r.length + '개 중 ' + r.filter(x => x.pass).length + '개 통과'); })"`
  → `editor.test.js`와 그것이 불러오는 모듈은 DOM·`localStorage`·`window`를 쓰면 안 된다(`storage.js`, `view.js`, `main.js`는 불러오지 않음).
- 전역 변수 없음(모듈 스코프만). `var` 없음.

---

## 8. 모듈 인터페이스

모든 순수 함수는 **입력을 바꾸지 않고 새 값을 돌려준다**. 바뀐 게 없으면 **입력과 같은 참조**를 돌려준다(main.js가 `===`로 "변화 없음"을 판단해 이력·저장을 건너뜀).

### 8.1 자료 형태

```js
// Color: '#rrggbb' (소문자 6자리) | null (빈 칸·투명)

// Pixels: Color[] — 길이 size * size, 행 우선. 인덱스 = y * size + x
//   (x: 왼→오른 열 0..size-1, y: 위→아래 행 0..size-1)

// Cell: { x: number, y: number }

// History
{
  past: Pixels[],    // 되돌리기용, 끝이 가장 최근
  future: Pixels[],  // 다시 하기용, 끝이 가장 최근에 되돌린 것
  limit: number      // 50
}

// Settings (storage.js가 저장)
{
  color: Color,        // 현재 색 (null이면 지우개 상태였음)
  tool: 'pen' | 'eraser' | 'fill' | 'picker',
  customColor: string, // 사용자 색 '#rrggbb'
  grid: boolean,
  scale: 1 | 8 | 16 | 32
}
```

### 8.2 `palette.js`

```js
export const PALETTE = [ { name: '검정', hex: '#14161c' }, /* … 3.1 표 순서대로 16개 */ ];
export const DEFAULT_COLOR = '#14161c';

// 팔레트에 있는 색이면 이름, 아니면 null
export function colorName(hex) { /* → string | null */ }

// 알림·레이블용 설명: '빨강' / '#12ab34' / '빈 칸'
export function describeColor(color) { /* → string */ }
```

### 8.3 `editor.js`

```js
export const SIZE = 16;
export const HISTORY_LIMIT = 50;
export const TOOLS = ['pen', 'eraser', 'fill', 'picker'];

// --- 기본 ---
export function createPixels(size = SIZE) { /* → Pixels (모두 null) */ }
export function inBounds(x, y, size = SIZE) { /* → boolean */ }
export function getPixel(pixels, x, y, size = SIZE) { /* → Color (범위 밖이면 null) */ }
export function isBlank(pixels) { /* → boolean */ }
export function samePixels(a, b) { /* → boolean (값 비교) */ }

// '#ABC', '#aabbcc', 'AABBCC' 등을 '#aabbcc'로. 올바르지 않으면 null
export function normalizeHex(value) { /* → string | null */ }

// --- 그리기 ---
// 브레젠험 직선이 지나는 칸 (양 끝 포함, 시작 → 끝 순서). 같은 점이면 [start]
export function lineCells(x0, y0, x1, y1) { /* → Cell[] */ }

// 여러 칸을 한 색으로(지우개는 color = null). 범위 밖 칸은 건너뜀
export function paintCells(pixels, cells, color, size = SIZE) { /* → Pixels */ }

// 4방향 같은 색 영역 채우기(빈 칸 영역 포함). 시작 칸 색 === color면 같은 참조. 재귀 대신 스택 사용
export function floodFill(pixels, x, y, color, size = SIZE) { /* → Pixels */ }

// 스포이트
export function pickColor(pixels, x, y, size = SIZE) { /* → Color */ }

// --- 이력 ---
export function createHistory(limit = HISTORY_LIMIT) { /* → History */ }
// 동작 전 그림(before)과 후 그림(after)이 다르면 before를 past에 넣고 future를 비움. 같으면 같은 참조
export function commit(history, before, after) { /* → History */ }
export function canUndo(history) { /* → boolean */ }
export function canRedo(history) { /* → boolean */ }
// 할 게 없으면 null
export function undo(history, current) { /* → { history: History, pixels: Pixels } | null */ }
export function redo(history, current) { /* → { history: History, pixels: Pixels } | null */ }

// --- 직렬화 (storage.js가 사용) ---
// → '{"version":1,"size":16,"pixels":[null,"#e0393e",...]}'
export function serializeDrawing(pixels, size = SIZE) { /* → string */ }
// 형식·길이·색 값이 하나라도 이상하면 null (부분 복구하지 않음)
export function parseDrawing(text, size = SIZE) { /* → Pixels | null */ }
// 이상한 필드는 기본값으로 바꿔 항상 올바른 Settings를 돌려줌
export function parseSettings(text) { /* → Settings */ }
export function defaultSettings() { /* → Settings */ }
```

- `commit`은 `past`가 `limit`를 넘으면 가장 오래된 것부터 버린다.
- `main.js` 획 처리: 획 시작 시 `before = pixels` 기억 → 칸마다 `paintCells` → 획 끝에 `history = commit(history, before, pixels)`.

### 8.4 `png.js`

```js
export const SCALES = [1, 8, 16, 32];
export const DEFAULT_SCALE = 16;

// '#e0393e' → [224, 57, 62]
export function hexToRgb(hex) { /* → [r, g, b] */ }

// 칸 하나를 scale×scale 블록으로 늘린 RGBA 바이트. 빈 칸은 [0,0,0,0], 색 칸은 알파 255
export function toRgba(pixels, size, scale) {
  /* → { width: size * scale, height: size * scale, data: Uint8ClampedArray } */
}

// makeFileName(new Date(2026, 10, 20, 15, 32, 4), 256) → 'kokkok-20261120-153204-256px.png'
export function makeFileName(date, width) { /* → string */ }
```

### 8.5 `storage.js`

```js
// 키: 'pixel-editor:drawing', 'pixel-editor:settings'
export function loadDrawing() { /* → Pixels | null (없음·실패·이상값) */ }
export function saveDrawing(pixels) { /* → boolean (실패하면 false, 예외를 밖으로 던지지 않음) */ }
export function loadSettings() { /* → Settings */ }
export function saveSettings(settings) { /* → boolean */ }
// 시작 시 한 번 쓰고 지워 보는 방식으로 저장 가능 여부 확인
export function isStorageAvailable() { /* → boolean */ }
```

- 모든 `localStorage` 접근은 `try/catch` 안. 저장이 안 되는 환경이면 저장 버튼 아래에 "이 브라우저에서는 자동 저장이 꺼져 있어요." 한 줄(`text-muted`)을 보여주고, 앱은 메모리 상태로 계속 동작한다.

### 8.6 `view.js` (DOM)

```js
// 캔버스 크기를 CSS 크기 × devicePixelRatio에 맞춤. 바뀌었으면 true
export function fitCanvas(canvas) { /* → boolean */ }
// 화면 좌표 → 칸 (범위 밖이면 null)
export function cellFromPoint(canvas, clientX, clientY, size) { /* → Cell | null */ }
// 전체 다시 그리기. colors는 readCanvasColors()가 읽은 토큰 값
export function render(canvas, { pixels, size, grid, hover, cursor, colors }) { /* → void */ }
export function readCanvasColors() { /* → { checkerA, checkerB, gridLine, hoverLine, cursorInner, cursorOuter } */ }
```

### 8.7 `main.js` 책임 (요약)
- 시작: `loadDrawing()`(없으면 `createPixels()`), `loadSettings()`, `createHistory()`, 팔레트·도구 UI 만들기, `ResizeObserver` + 첫 렌더.
- 입력(5장) → 순수 함수 → 바뀌었으면 상태 교체 → `requestAnimationFrame` 렌더, 버튼 상태(`aria-pressed`, `disabled`) 갱신, 알맞은 시점에 저장.
- 대화상자 열기·닫기·포커스 복귀, PNG Blob 생성·URL 관리·다운로드.
- 테마 변경(`storage` 이벤트, `matchMedia` `change`) 반영.

---

## 9. Embed 계획

### 9.1 `apps/index.json` 항목 (배열 끝에 추가)

```json
{
  "slug": "pixel-editor",
  "title": "콕콕 — 16×16 픽셀 아트",
  "description": "16×16 칸에 점을 콕콕 찍어 그림을 그리고 PNG로 저장해요. 마우스·터치·키보드로 그릴 수 있고, 그리던 그림은 자동으로 남아요.",
  "preview": "preview.svg"
}
```

- **블로그 코드는 고치지 않는다.** `js/main.js`의 `loadApps()`가 `apps/index.json`을 읽고, `renderAppCard()`가 `apps/<slug>/`와 `apps/<slug>/preview.svg`(640×400)를 만든다. `pixel-editor`는 `isValidSlug`, `preview.svg`는 `isValidPreview`를 통과한다.
- 카드는 매니페스트 순서대로 그려지므로, 끝에 추가하면 "모아" 다음에 나온다(열린 질문 4).

### 9.2 미리보기 이미지 `preview.svg`
- iframe이 아니라 이미지인 이유는 tile-merge와 같다(캔버스의 `touch-action: none`이 목록 스크롤을 막고, 목록을 열 때마다 앱 전체가 로드됨).
- `viewBox="0 0 640 400"`, `width="640" height="400"`, `role="img"` + `<title>콕콕 픽셀 아트 에디터 미리보기</title>`. 외부 리소스 없음, `shape-rendering="crispEdges"`.
- 내용:
  - 배경 `#0f1220`(tile-merge 미리보기와 같은 남색 → 블로그 라이트/다크 어디서나 어울리고 두 카드가 한 세트로 보임).
  - 왼쪽: "콕콕"(굵게, `#e6e9f2`) + "16×16 Pixel Art"(`#9aa3b8`) + `--accent` 다크 값 `#5fd4c0` 짧은 막대. tile-merge와 같은 위치·크기.
  - 오른쪽: 체크무늬 위에 **16×16 도트 그림 하나**(한 칸 18px → 288×288, 얇은 격자선). 그림은 직접 만든 원본 도안 — **화분에 핀 새싹**(갈색 화분, 초록·연두 잎, 노란 꽃 하나). 3.1 팔레트 색만 쓴다.
  - 그림 아래쪽 또는 제목 아래에 팔레트 스와치 8개를 작은 띠로.

---

## 10. 수용 기준 (Review 체크리스트)

### 기능
- [ ] 처음 열면 16×16 빈 그림(체크무늬), 현재 색 검정, 펜 선택, 격자선 켜짐.
- [ ] 펜: 누른 칸이 칠해지고, 빠르게 끌어도 칸이 비지 않는다(대각선으로 빠르게 그은 선이 끊기지 않음).
- [ ] 지우개: 칸이 빈 칸(체크무늬)으로 돌아간다.
- [ ] 채우기: 4방향으로 이어진 같은 색 영역만 바뀐다(대각선으로만 닿은 칸은 안 바뀜). 빈 칸 영역도 채워진다. 같은 색에 채우기를 하면 이력이 늘지 않는다.
- [ ] 스포이트: 색 칸 → 그 색 + 펜, 빈 칸 → 지우개.
- [ ] 지우개·스포이트 상태에서 팔레트 색을 누르면 펜으로 바뀐다.
- [ ] 되돌리기/다시 하기: 한 획이 한 단계, 50단계 제한, 새 동작 뒤 다시 하기 비활성. 버튼 `disabled` 상태가 맞다.
- [ ] 전체 지우기: 확인 대화상자, 기본 포커스 "취소", `Esc`로 취소, "지우기" 후 되돌리기로 복구. 빈 그림에서는 버튼 비활성.
- [ ] 격자선 토글이 화면에만 영향을 주고 PNG에는 들어가지 않는다.
- [ ] 사용자 색: 고른 색으로 칠해지고, 새로고침 후에도 사용자 칸에 남는다.
- [ ] 자동 저장: 그린 뒤 새로고침하면 그림·현재 색·도구·격자·배율이 그대로. 되돌리기 이력은 비어 있다.
- [ ] 저장값을 망가뜨려도(예: `pixel-editor:drawing`에 `"abc"` 또는 길이가 다른 배열) 오류 없이 빈 그림으로 시작한다.
- [ ] `localStorage`가 막힌 환경에서도 그리기·저장(PNG)이 되고 "자동 저장이 꺼져 있어요" 안내가 보인다.
- [ ] `test.html`의 모든 테스트 통과, 같은 테스트가 Node(7장 명령)에서도 통과.

### PNG 결과물 (픽셀 검증)
- [ ] 각 배율(1·8·16·32)에서 파일 크기가 16·128·256·512px 정사각형이다.
- [ ] 받은 PNG를 같은 크기 캔버스에 `drawImage` 후 `getImageData`로 읽었을 때 `toRgba` 결과와 **바이트가 완전히 같다**(번짐 없음). 특히 칸 경계(`scale - 1`과 `scale` 위치) 두 픽셀이 각 칸 색 그대로다.
- [ ] 빈 칸은 알파 0, 색 칸은 알파 255이고, 결과에 나오는 색 종류 = 그림에 쓴 색 + (빈 칸이 있으면) 투명뿐이다.
- [ ] 격자선·체크무늬·커서 색이 PNG에 없다.
- [ ] 파일 이름이 `kokkok-YYYYMMDD-HHMMSS-<폭>px.png` 형식.
- [ ] 저장 대화상자의 미리보기 이미지가 실제 저장 파일과 같은 Blob이고, `image-rendering: pixelated`로 선명하게 보인다. 대화상자를 닫거나 배율을 바꾸면 이전 URL을 해제한다.

### 입력·모바일
- [ ] 375px 모바일 에뮬레이션(터치)에서 찍기·끌어 그리기가 되고, 캔버스 위에서 끄는 동안 페이지가 스크롤·확대되지 않는다. 캔버스 밖에서는 스크롤된다.
- [ ] 캔버스를 길게 눌러도 메뉴·텍스트 선택이 뜨지 않는다.
- [ ] 두 번째 손가락이 닿아도 그림이 엉뚱하게 칠해지지 않는다(첫 포인터만).
- [ ] 끌다가 캔버스 밖으로 나갔다 돌아와도 획이 이어지고, 밖에서는 칠해지지 않는다.
- [ ] 375px 폭에서 가로 스크롤 없음, 좌우 여백 16px 이상, 버튼·링크·스와치·라디오 모두 44×44px 이상.
- [ ] 48rem 이상에서 2열 배치, 캔버스 최대 512px. 창 크기를 바꿔도 캔버스가 흐려지지 않는다(고해상도 화면 포함).

### 키보드·접근성
- [ ] Tab으로 뒤로 가기 → 캔버스 → 도구 → 팔레트 → 저장 순으로 자연스럽게 이동, `:focus-visible` 외곽선이 보인다.
- [ ] 캔버스에서 방향키로 커서 이동(페이지 스크롤 없음), `Enter`로 한 칸, `Space`를 누른 채 방향키로 이어 칠하기, 떼면 한 단계로 되돌릴 수 있다.
- [ ] 키보드 커서가 흰색·검정·빈 칸 위 어디서나 보인다(두 겹 링).
- [ ] 단일 문자 단축키는 에디터 영역에 포커스가 있을 때만, `Ctrl/⌘+Z` 계열은 어디서나(대화상자 밖) 동작. `Ctrl`+`B` 같은 브라우저 단축키를 가로채지 않는다.
- [ ] 팔레트 스와치마다 색 이름 레이블(`aria-label`), 선택 상태 `aria-pressed`. 도구 버튼도 `aria-pressed`.
- [ ] live 영역이 도구·색 변경, 되돌리기, 지우기, 저장, 키보드 커서 위치를 알린다. 포인터로 칠할 때는 알리지 않는다.
- [ ] 대화상자가 열리면 지정한 요소로 포커스, 닫히면 연 버튼으로 돌아온다.
- [ ] 두 테마 모두 글자 대비 4.5:1, 선택 링·테두리·커서 3:1 이상(계산 결과를 review.md에 기록).

### 다크 모드
- [ ] OS 라이트/다크 각각 올바른 테마, 캔버스 체크무늬·격자선도 테마에 맞다.
- [ ] 블로그에서 `theme`을 저장한 뒤 열면 그 테마를 따르고, 다른 탭에서 바꾸면 화면과 **캔버스가 함께** 바로 바뀐다.
- [ ] 앱이 `theme` 키에 쓰지 않는다.

### 코드·규칙
- [ ] 콘솔 에러·경고 없음(앱 페이지, `test.html` 모두).
- [ ] 외부 라이브러리·CDN 없음, `/`로 시작하는 경로 없음, `var` 없음, 전역 변수 없음.
- [ ] `editor.js`·`png.js`·`palette.js`가 DOM·`window`·`localStorage`를 쓰지 않는다.
- [ ] `localStorage` 접근이 모두 `try/catch` 안에 있다.
- [ ] UI 색은 모두 CSS 변수(팔레트·그림 색만 예외, 주석 있음).
- [ ] ES 모듈, 2칸 들여쓰기, 세미콜론, 작은따옴표, kebab-case 클래스, 한국어 주석·UI.
- [ ] `apps/pixel-editor/` 밖의 파일을 바꾸지 않았다(Build 단계 기준).
- [ ] `node serve.js`로 띄운 `http://localhost:8000/apps/pixel-editor/`에서 동작하고, `file://`로 열면 안내 문구가 보인다.

---

## 11. 범위 밖 (이번에 하지 않음)

- 선·사각형·원·선택·이동 도구, 대칭 그리기
- 확대/축소·화면 이동, 16×16 외 격자 크기
- 레이어, 애니메이션(GIF·스프라이트 시트), 반투명 색
- 그림 여러 장 저장·갤러리, PNG/이미지 불러오기
- 공유(Web Share API, 링크), 온라인 저장
- 사용자 색 여러 개 기억(1개만)
- 펜 압력·펜 지우개 버튼 구분
- 앱 자체 테마 토글(블로그 테마를 따름)
- 칸 하나하나를 스크린리더로 표 탐색하는 기능(커서 위치 알림까지만)
- 오프라인 지원(Service Worker), PWA 설치

---

## 12. 확정된 결정 (2026-11-20, 사용자 답변)

1. **앱 이름**: 콕콕 (*Kokkok — 16×16 Pixel Art*).
2. **PNG 기본 크기**: 256px(16배), 선택지 16·128·256·512px.
3. **사용자 지정 색**: 1칸(나머지는 스포이트로 다시 집기).
4. **블로그 카드 순서**: `apps/index.json` 끝에 추가(만든 순서).
5. **모바일 확대 모드**: 넣지 않음(6.2의 보완책으로 진행).
