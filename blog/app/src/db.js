// 2층 → 3층 연결. 커넥션 풀을 만들어 두고 모든 라우트가 같이 쓴다.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'blog',
  charset: 'utf8mb4',
  connectionLimit: 10,
  dateStrings: true,
});

module.exports = pool;
