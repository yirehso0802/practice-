const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

function issueToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: '아이디는 영문/숫자/_ 3~30자로 입력해 주세요.' });
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
    return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, hash]
    );
    const user = { id: result.insertId, username };
    res.status(201).json({ token: issueToken(user), user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
    }
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해 주세요.' });
  }

  const [rows] = await pool.query(
    'SELECT id, username, password_hash FROM users WHERE username = ?',
    [username]
  );
  const row = rows[0];
  const ok = row && (await bcrypt.compare(password, row.password_hash));
  if (!ok) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

  const user = { id: row.id, username: row.username };
  res.json({ token: issueToken(user), user });
});

module.exports = router;
