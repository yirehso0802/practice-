// 모든 페이지가 같이 쓰는 코드: API 호출, 로그인 상태, 상단 메뉴

const auth = {
  get token() { return localStorage.getItem('token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  },
  save({ token, user }) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// 1층 → 2층 호출. 같은 주소의 /api/... 로 요청하면 Nginx가 app 컨테이너로 넘겨준다.
async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth.token) auth.clear(); // 토큰 만료
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

// XSS 방지: 사용자 입력은 항상 textContent 로만 넣는다
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

function formatDate(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T'));
  return isNaN(d) ? s : d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function showError(target, message) {
  target.replaceChildren(el('p', { class: 'msg error', text: message }));
}

function renderNav() {
  const right = el('div', { class: 'nav-right' });
  const user = auth.user;
  if (user && auth.token) {
    right.append(
      el('span', { class: 'nav-user', text: `${user.username}님` }),
      el('a', { class: 'btn', href: '/write.html', text: '글쓰기' }),
      el('button', {
        class: 'btn ghost', text: '로그아웃',
        onclick: () => { auth.clear(); location.href = '/'; },
      })
    );
  } else {
    right.append(el('a', { class: 'btn', href: '/login.html', text: '로그인' }));
  }
  const nav = el('header', { class: 'nav' },
    el('div', { class: 'nav-inner' },
      el('a', { class: 'brand', href: '/', text: '📝 My Blog' }),
      right
    )
  );
  document.body.prepend(nav);
}

renderNav();
