// 최고 점수 저장소
//
// localStorage는 시크릿 모드나 차단 설정에서 예외를 던질 수 있으므로
// 읽기·쓰기를 모두 try/catch로 감싼다.

const BEST_SCORE_KEY = 'tile-merge:best-score';

// 저장된 최고 점수를 읽는다. 없거나 0 이상의 정수가 아니면 0.
export function loadBestScore() {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    if (raw === null || raw.trim() === '') return 0;
    const value = Number(raw);
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch (error) {
    return 0;
  }
}

// 최고 점수를 저장한다. 실패해도 조용히 넘어간다.
export function saveBestScore(score) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch (error) {
    // 저장할 수 없어도 이번 방문 동안은 메모리 값으로 보여준다.
  }
}
