const jwt = require('jsonwebtoken');

// "Authorization: Bearer <토큰>" 헤더를 검사해서 req.user 에 로그인 정보를 넣는다.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: '로그인이 만료되었습니다. 다시 로그인해 주세요.' });
  }
}

module.exports = { requireAuth };
