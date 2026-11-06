// 2층: Application tier — REST API 서버
const express = require('express');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET 환경변수가 없습니다. .env 파일을 확인하세요.');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ app: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ app: 'ok', db: 'error' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/posts/:id/comments', commentRoutes);
app.use('/api/posts', postRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: '없는 API입니다.' }));

// Express 5는 async 함수에서 난 에러도 여기로 보내준다
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '요청 형식(JSON)이 올바르지 않습니다.' });
  }
  console.error(err);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API server listening on :${port}`));
