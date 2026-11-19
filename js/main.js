// 앱 시작점: 라우팅에 따라 글 목록이나 글 상세를 렌더링한다.

import { parseFrontMatter } from './frontmatter.js';
import { renderMarkdown } from './markdown.js';
import { initThemeToggle } from './theme.js';
import { parseRoute, onRouteChange, isRouteHash, isValidSlug } from './router.js';
import { escapeHtml, formatDate } from './utils.js';

const SITE_TITLE = 'My Blog';
const app = document.getElementById('app');

let postsCache = null;
// 빠르게 여러 번 이동했을 때 늦게 도착한 응답이 화면을 덮어쓰지 않게 하는 번호
let renderId = 0;

// ---------------------------------------------------------------------------
// 데이터 불러오기
// ---------------------------------------------------------------------------

async function loadPosts() {
  if (postsCache) return postsCache;

  const res = await fetch('posts/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`글 목록을 불러오지 못했어요 (HTTP ${res.status})`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('posts/index.json 형식이 올바르지 않아요.');

  // 날짜 최신순으로 정렬하고, 날짜가 같으면 index.json에 나중에 추가한 글을 위에 둔다.
  postsCache = data
    .map((post, order) => ({ post, order }))
    .filter(({ post }) => post && isValidSlug(post.slug))
    .sort(
      (a, b) =>
        String(b.post.date || '').localeCompare(String(a.post.date || '')) || b.order - a.order
    )
    .map(({ post }) => post);
  return postsCache;
}

async function loadPost(slug) {
  const res = await fetch(`posts/${slug}.md`, { cache: 'no-cache' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`글을 불러오지 못했어요 (HTTP ${res.status})`);
  return res.text();
}

// ---------------------------------------------------------------------------
// 화면 조각
// ---------------------------------------------------------------------------

function renderTags(tags) {
  const list = Array.isArray(tags) ? tags : tags ? [tags] : [];
  if (list.length === 0) return '';
  const items = list.map((tag) => `<li class="tag">${escapeHtml(tag)}</li>`).join('');
  return `<ul class="tags" aria-label="태그">${items}</ul>`;
}

function renderDate(date) {
  if (!date) return '';
  return `<time datetime="${escapeHtml(date)}">${escapeHtml(formatDate(date))}</time>`;
}

function renderMessage(title, text) {
  app.innerHTML = `
    <section class="message">
      <h1 class="message-title">${escapeHtml(title)}</h1>
      <p>${escapeHtml(text)}</p>
      <a class="back-link" href="#/">← 목록으로</a>
    </section>`;
}

function renderLoading() {
  app.innerHTML = '<p class="loading" role="status">불러오는 중…</p>';
}

// file:// 로 열었을 때의 안내는 index.html의 인라인 스크립트가 맡는다
// (그 경우 브라우저가 이 모듈 자체를 불러오지 않기 때문).
function renderError(error) {
  renderMessage('문제가 생겼어요', error.message || '잠시 후 다시 시도해 주세요.');
}

function renderNotFound() {
  document.title = `찾을 수 없음 · ${SITE_TITLE}`;
  renderMessage('글을 찾을 수 없어요', '주소가 바뀌었거나 삭제된 글일 수 있어요.');
}

// ---------------------------------------------------------------------------
// 페이지
// ---------------------------------------------------------------------------

async function showList(id) {
  const posts = await loadPosts();
  if (id !== renderId) return;

  document.title = SITE_TITLE;

  if (posts.length === 0) {
    app.innerHTML = '<p class="empty">아직 글이 없어요.</p>';
    return;
  }

  const items = posts
    .map(
      (post) => `
      <li class="post-item">
        <article>
          <h2 class="post-item-title">
            <a href="#/post/${post.slug}">${escapeHtml(post.title || post.slug)}</a>
          </h2>
          <p class="post-meta">${renderDate(post.date)}</p>
          ${post.description ? `<p class="post-item-desc">${escapeHtml(post.description)}</p>` : ''}
          ${renderTags(post.tags)}
        </article>
      </li>`
    )
    .join('');

  app.innerHTML = `
    <h1 class="page-title">최근 글</h1>
    <ul class="post-list">${items}</ul>`;
}

async function showPost(slug, id) {
  const [text, posts] = await Promise.all([loadPost(slug), loadPosts().catch(() => [])]);
  if (id !== renderId) return;

  if (text === null) {
    renderNotFound();
    return;
  }

  const { meta, body } = parseFrontMatter(text);
  const entry = posts.find((post) => post.slug === slug) || {};
  const title = meta.title || entry.title || slug;
  const date = meta.date || entry.date;
  const tags = meta.tags || entry.tags;

  app.innerHTML = `
    <article class="post">
      <header class="post-header">
        <h1 class="post-title">${escapeHtml(title)}</h1>
        <p class="post-meta">${renderDate(date)}</p>
        ${renderTags(tags)}
      </header>
      <div class="post-body">
        ${renderMarkdown(body)}
      </div>
      <footer class="post-footer">
        <a class="back-link" href="#/">← 목록으로</a>
      </footer>
    </article>`;

  document.title = `${title} · ${SITE_TITLE}`;
}

async function render(route, { focus = true } = {}) {
  renderId += 1;
  const id = renderId;
  renderLoading();

  try {
    if (route.name === 'list') {
      await showList(id);
    } else if (route.name === 'post') {
      await showPost(route.slug, id);
    } else {
      renderNotFound();
    }
  } catch (error) {
    if (id === renderId) renderError(error);
  }

  if (id !== renderId) return;
  window.scrollTo(0, 0);
  // 화면이 바뀌었음을 스크린 리더에 알리기 위해 본문으로 포커스를 옮긴다.
  if (focus) app.focus({ preventScroll: true });
}

// 본문 안의 '#제목' 앵커 링크는 라우터 대신 해당 제목으로 스크롤한다.
function handleAnchorClick(event) {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const href = link.getAttribute('href');
  if (isRouteHash(href)) return;

  event.preventDefault();
  let targetId = href.slice(1);
  try {
    targetId = decodeURIComponent(targetId);
  } catch (e) {
    // 잘못 인코딩된 주소는 그대로 사용한다.
  }
  const target = document.getElementById(targetId);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------------------------------------------------------------------
// 시작
// ---------------------------------------------------------------------------

function start() {
  initThemeToggle(document.getElementById('theme-toggle'));
  document.getElementById('year').textContent = String(new Date().getFullYear());
  app.addEventListener('click', handleAnchorClick);

  onRouteChange((route) => render(route));
  render(parseRoute(isRouteHash(location.hash) ? location.hash : '#/'), { focus: false });
}

start();
