// 해시 기반 라우터
//
//   #/              → 글 목록
//   #/post/<slug>   → 글 상세
//   그 외           → 찾을 수 없음

const SLUG_PATTERN = /^[a-z0-9-]+$/;

// slug는 파일 경로에 그대로 쓰이므로 허용된 문자만 통과시킨다 ('../' 같은 경로 조작 방지).
export function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_PATTERN.test(slug);
}

export function parseRoute(hash) {
  const path = String(hash).replace(/^#/, '');

  if (path === '' || path === '/') {
    return { name: 'list' };
  }

  const match = path.match(/^\/post\/([^/]+)\/?$/);
  if (match && isValidSlug(match[1])) {
    return { name: 'post', slug: match[1] };
  }

  return { name: 'notFound' };
}

// 본문 안의 '#제목' 같은 앵커 링크는 라우팅 대상이 아니다.
export function isRouteHash(hash) {
  return hash === '' || hash === '#' || hash.startsWith('#/');
}

export function onRouteChange(handler) {
  window.addEventListener('hashchange', () => {
    if (isRouteHash(location.hash)) handler(parseRoute(location.hash));
  });
}
