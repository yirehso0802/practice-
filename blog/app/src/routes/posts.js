const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const PAGE_SIZE = 10;

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validatePost(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!title || title.length > 200) return { error: '제목은 1~200자로 입력해 주세요.' };
  if (!content || content.length > 20000) return { error: '내용은 1~20000자로 입력해 주세요.' };
  return { title, content };
}

// GET /api/posts?page=1
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [rows] = await pool.query(
    `SELECT p.id, p.title, LEFT(p.content, 160) AS excerpt, p.created_at,
            u.username,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
       FROM posts p JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?`,
    [PAGE_SIZE, offset]
  );
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM posts');

  res.json({ posts: rows, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total });
});

// GET /api/posts/:id
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: '잘못된 글 번호입니다.' });

  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.content, p.created_at, p.updated_at, p.user_id, u.username
       FROM posts p JOIN users u ON u.id = p.user_id
      WHERE p.id = ?`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });
  res.json(rows[0]);
});

// POST /api/posts
router.post('/', requireAuth, async (req, res) => {
  const v = validatePost(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  const [result] = await pool.query(
    'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
    [req.user.id, v.title, v.content]
  );
  res.status(201).json({ id: result.insertId });
});

// 작성자 본인인지 확인하는 공통 로직
async function loadOwnPost(req, res) {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: '잘못된 글 번호입니다.' });
    return null;
  }
  const [rows] = await pool.query('SELECT id, user_id FROM posts WHERE id = ?', [id]);
  if (!rows[0]) {
    res.status(404).json({ error: '글을 찾을 수 없습니다.' });
    return null;
  }
  if (rows[0].user_id !== req.user.id) {
    res.status(403).json({ error: '본인이 쓴 글만 수정/삭제할 수 있습니다.' });
    return null;
  }
  return rows[0];
}

// PUT /api/posts/:id
router.put('/:id', requireAuth, async (req, res) => {
  const post = await loadOwnPost(req, res);
  if (!post) return;
  const v = validatePost(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  await pool.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [
    v.title,
    v.content,
    post.id,
  ]);
  res.json({ id: post.id });
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const post = await loadOwnPost(req, res);
  if (!post) return;
  await pool.query('DELETE FROM posts WHERE id = ?', [post.id]);
  res.status(204).end();
});

module.exports = router;
