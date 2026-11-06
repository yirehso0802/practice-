# 3-Tier 블로그 웹사이트 계획 (Docker)

## 1. 목표

글을 쓰고, 보고, 수정하고, 지울 수 있는 블로그를 **3계층 구조**로 만들고, 각 계층을 **Docker 컨테이너**로 분리해서 `docker compose up` 한 번에 실행되게 한다.

## 2. 전체 구조

```
 [브라우저]
     │  http://localhost:8080
     ▼
┌──────────────────────────┐
│ 1층: Presentation (web)   │  Nginx
│ - HTML/CSS/JS 정적 파일 제공 │
│ - /api/* 요청은 app으로 전달 │
└────────────┬─────────────┘
             │ http://app:3000
             ▼
┌──────────────────────────┐
│ 2층: Application (app)    │  Node.js + Express
│ - REST API, 입력 검증, 로그인 │
└────────────┬─────────────┘
             │ mysql://db:3306
             ▼
┌──────────────────────────┐
│ 3층: Data (db)            │  MySQL 8
│ - 글/댓글/사용자 저장 (볼륨)   │
└──────────────────────────┘
```

핵심 규칙: **각 층은 바로 아래 층하고만 대화한다.** 브라우저는 DB에 직접 접근할 수 없고, DB 포트는 외부에 열지 않는다.

## 3. 기술 선택

| 계층 | 기술 | 이유 |
|---|---|---|
| Presentation | Nginx + HTML/CSS/바닐라 JS | 지금까지 만든 HTML 페이지와 같은 방식이라 익숙함. 나중에 React로 교체 가능 |
| Application | Node.js 20 + Express | 프론트와 같은 JavaScript, 자료가 많음 |
| Data | MySQL 8 | 학교/자격증에서 많이 쓰는 SQL DB |
| 실행 환경 | Docker + Docker Compose | 3개 컨테이너를 한 번에 관리 |

## 4. 폴더 구조

```
blog/
├── docker-compose.yml
├── .env.example          # DB 비밀번호 등 (실제 .env는 git에 올리지 않음)
├── web/                  # 1층
│   ├── Dockerfile
│   ├── nginx.conf
│   └── public/
│       ├── index.html    # 글 목록
│       ├── post.html     # 글 상세 + 댓글
│       ├── write.html    # 글쓰기/수정
│       ├── login.html
│       ├── css/style.css
│       └── js/api.js     # fetch('/api/...') 모음
├── app/                  # 2층
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js      # 서버 시작
│       ├── db.js         # MySQL 연결 풀
│       ├── routes/
│       │   ├── posts.js
│       │   ├── comments.js
│       │   └── auth.js
│       └── middleware/auth.js
└── db/                   # 3층
    └── init.sql          # 테이블 생성 + 샘플 데이터
```

## 5. 데이터베이스 설계

```sql
users    (id PK, username UNIQUE, password_hash, created_at)
posts    (id PK, user_id FK→users, title, content TEXT, created_at, updated_at)
comments (id PK, post_id FK→posts ON DELETE CASCADE, user_id FK→users, content, created_at)
```

## 6. API 설계

| 메서드 | 경로 | 설명 | 로그인 필요 |
|---|---|---|---|
| POST | /api/auth/register | 회원가입 | |
| POST | /api/auth/login | 로그인 → JWT 발급 | |
| GET | /api/posts?page=1 | 글 목록 (페이지네이션) | |
| GET | /api/posts/:id | 글 상세 | |
| POST | /api/posts | 글 작성 | ✅ |
| PUT | /api/posts/:id | 글 수정 (작성자만) | ✅ |
| DELETE | /api/posts/:id | 글 삭제 (작성자만) | ✅ |
| GET | /api/posts/:id/comments | 댓글 목록 | |
| POST | /api/posts/:id/comments | 댓글 작성 | ✅ |
| GET | /api/health | 서버/DB 상태 확인 | |

## 7. Docker 구성

### docker-compose.yml (초안)

```yaml
services:
  web:
    build: ./web
    ports:
      - "8080:80"          # 외부에 열리는 유일한 포트
    depends_on:
      - app
    networks: [front]

  app:
    build: ./app
    environment:
      DB_HOST: db
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: blog
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      db:
        condition: service_healthy
    networks: [front, back]

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: blog
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/mysql                         # 컨테이너를 지워도 데이터 유지
      - ./db:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      retries: 10
    networks: [back]       # web과 같은 네트워크에 없음 → 직접 접근 불가

networks:
  front:
  back:

volumes:
  db-data:
```

**네트워크 분리 포인트:** `web`은 `front`에만, `db`는 `back`에만 있고, `app`만 둘 다에 연결된다. 그래서 3계층이 Docker 수준에서도 실제로 분리된다.

### web/nginx.conf 핵심

```nginx
location /      { root /usr/share/nginx/html; try_files $uri $uri/ /index.html; }
location /api/  { proxy_pass http://app:3000; }
```

같은 주소(8080)에서 화면과 API를 함께 제공하므로 CORS 설정이 필요 없다.

## 8. 단계별 진행 계획

| 단계 | 할 일 | 완료 확인 방법 |
|---|---|---|
| 0. 준비 | Docker Desktop 설치, `docker --version` 확인 | `docker run hello-world` 성공 |
| 1. DB | `init.sql` 작성, compose에 db만 띄우기 | `docker compose exec db mysql -u... -p` 로 테이블 확인 |
| 2. App 기본 | Express 서버 + `/api/health` + DB 연결 | `curl localhost:3000/api/health` → `{"db":"ok"}` (개발 중엔 포트 임시 개방) |
| 3. 글 CRUD API | posts 라우트 구현 | curl/Postman으로 작성·조회·수정·삭제 |
| 4. Web | Nginx 컨테이너 + 목록/상세/글쓰기 페이지 | 브라우저 `localhost:8080`에서 글 보기·쓰기 |
| 5. 로그인 | 회원가입/로그인, bcrypt 해시, JWT, 작성자만 수정/삭제 | 다른 계정으로 남의 글 삭제 시 403 |
| 6. 댓글 | comments API + 상세 페이지에 댓글 UI | 댓글 작성 후 새로고침해도 유지 |
| 7. 마무리 | app 포트 닫기, `.env` 정리, README 작성, 디자인 다듬기 | `docker compose down && docker compose up --build` 후 정상 동작 + 데이터 유지 |

## 9. 보안 체크리스트

- [ ] SQL은 항상 `?` 자리표시자 사용 (SQL Injection 방지)
- [ ] 비밀번호는 bcrypt 해시로만 저장
- [ ] 글 내용을 화면에 넣을 때 `textContent` 사용 (XSS 방지)
- [ ] `.env`는 `.gitignore`에 추가, `.env.example`만 커밋
- [ ] 외부에 열린 포트는 8080 하나뿐인지 확인 (`docker compose ps`)

## 10. 자주 쓸 명령어

```bash
docker compose up --build -d   # 빌드 후 백그라운드 실행
docker compose logs -f app     # app 로그 보기
docker compose ps              # 상태 확인
docker compose down            # 중지 (데이터 유지)
docker compose down -v         # 중지 + DB 데이터까지 삭제 (초기화)
```

## 11. 이후 확장 아이디어

- 프론트엔드를 React(Vite)로 교체 → 빌드 결과물만 Nginx에 넣으면 됨
- 이미지 업로드 (app에 업로드 볼륨 추가)
- 검색, 태그, 좋아요
- 클라우드(AWS EC2 등)에 배포 + HTTPS
