-- 3층: Data tier. MySQL 컨테이너가 처음 만들어질 때 한 번만 실행된다.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(30)  NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS posts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  title      VARCHAR(200) NOT NULL,
  content    TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_posts_created (created_at)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  post_id    INT          NOT NULL,
  user_id    INT          NOT NULL,
  content    VARCHAR(1000) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET = utf8mb4;

-- 샘플 데이터: 'welcome' 계정은 비밀번호 해시가 '!'라서 로그인할 수 없다(안내용 계정).
INSERT INTO users (username, password_hash) VALUES ('welcome', '!');
INSERT INTO posts (user_id, title, content) VALUES
  (1, '블로그에 오신 것을 환영합니다 👋',
   '이 블로그는 3-Tier 구조로 만들어졌어요.\n\n1층 Nginx가 화면을 보여주고,\n2층 Node.js(Express)가 API를 처리하고,\n3층 MySQL이 글을 저장합니다.\n\n회원가입 후 첫 글을 써 보세요!');
INSERT INTO comments (post_id, user_id, content) VALUES
  (1, 1, '첫 댓글입니다. 로그인하면 댓글을 남길 수 있어요.');
