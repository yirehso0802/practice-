const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// /api/posts/:id/comments 에 붙는다 (mergeParams 로 :id 를 받음)
const router = express.Router({ mergeParams: true });

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/posts/:id/comments
router.get('/', async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ error: '잘못된 글 번호입니다.' });

  const [rows] = await pool.query(
    `SELECT c.id, c.content, c.created_at, c.user_id, u.username
       FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC, c.id ASC`,
    [postId]
  );
  res.json(rows);
});

// POST /api/posts/:id/comments
router.post('/', requireAuth, async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ error: '잘못된 글 번호입니다.' });

  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!content || content.length > 1000) {
    return res.status(400).json({ error: '댓글은 1~1000자로 입력해 주세요.' });
  }

  const [posts] = await pool.query('SELECT id FROM posts WHERE id = ?', [postId]);
  if (!posts[0]) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });

  const [result] = await pool.query(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
    [postId, req.user.id, content]
  );
  res.status(201).json({ id: result.insertId });
});

module.exports = router;
