// 다크 모드 토글
//
// 기본은 OS 설정(prefers-color-scheme)을 따르고,
// 버튼으로 직접 고르면 <html data-theme="dark|light">로 덮어쓴 뒤 localStorage에 저장한다.

const STORAGE_KEY = 'theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  return darkQuery.matches ? 'dark' : 'light';
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    // 저장소를 쓸 수 없어도 이번 방문 동안은 선택한 테마가 유지된다.
  }
}

function updateButton(button) {
  const label = currentTheme() === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
  button.setAttribute('aria-label', label);
  button.title = label;
}

export function initThemeToggle(button) {
  if (!button) return;
  updateButton(button);

  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    saveTheme(next);
    updateButton(button);
  });

  // 직접 고르지 않은 상태에서 OS 설정이 바뀌면 버튼 문구도 맞춰 준다.
  darkQuery.addEventListener('change', () => updateButton(button));
}
