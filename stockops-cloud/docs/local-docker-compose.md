# StockOps 로컬 Docker Compose 실행

이 문서는 수정/추가 개발을 위해 StockOps 관련 프로젝트를 로컬 Docker 환경에 함께 올리는 방법을 설명한다.

## 포함 서비스

| 서비스 | 포트 | 설명 |
|---|---:|---|
| `postgres` | 5432 | API dev DB |
| `redis` | 6379 | Spring Redis/cache/rate limit 테스트용 |
| `mqtt` | 1883 | Mosquitto MQTT broker |
| `backend` | 8080 | `stockops-api-server` |
| `admin-web` | 8081 | `stockops-admin-web` nginx 정적 빌드 |
| `sensimul` | - | Sensimul MQTT publisher |
| `sensimul-web` | 18080 | Sensimul web UI |
| `client-web` | 8082 | `stockops-client-web` placeholder |
| `mailhog` | 8025, 1025 | 로컬 SMTP 테스트 |

## 실행

```bash
cd /Users/hans/Documents/gitlab_workspace/stockops-cloud
docker compose -f docker-compose.local.yml up --build
```

백그라운드 실행:

```bash
docker compose -f docker-compose.local.yml up --build -d
```

## 접속 URL

```text
Admin Web:    http://localhost:8081
API Health:   http://localhost:8080/actuator/health
API Docs:     http://localhost:8080/swagger-ui.html
Sensimul Web: http://localhost:18080
Client Web:   http://localhost:8082
MailHog:      http://localhost:8025
MQTT:         localhost:1883
```

## 개발 흐름

API 또는 Sensimul Dockerfile 기반 코드를 수정한 뒤:

```bash
docker compose -f docker-compose.local.yml up --build backend
```

Admin Web 코드를 수정한 뒤:

```bash
docker compose -f docker-compose.local.yml up --build admin-web
```

전체 재빌드:

```bash
docker compose -f docker-compose.local.yml build --no-cache
docker compose -f docker-compose.local.yml up
```

## 정리

컨테이너 중지:

```bash
docker compose -f docker-compose.local.yml down
```

DB/Redis/Sensimul 볼륨까지 삭제:

```bash
docker compose -f docker-compose.local.yml down -v
```

## 주의사항

- 첫 실행은 API Maven build와 Admin npm build 때문에 시간이 걸린다.
- 현재 `stockops-admin-web`의 `package-lock.json`이 `package.json`과 맞지 않아 원본 Dockerfile의 `npm ci`가 실패한다. 또한 일부 테스트 파일 타입 오류가 `tsc -b`에서 함께 잡힌다. 로컬 Compose는 `local/admin-web.Dockerfile`에서 `npm install`과 `vite build`를 사용해 개발 환경을 우선 기동한다. CI/운영 빌드 전에는 Admin 프로젝트에서 lock 파일과 테스트 타입 오류를 정리하는 것이 좋다.
- API는 `SPRING_PROFILES_ACTIVE=dev`로 실행되며 PostgreSQL, Redis, MQTT는 Compose 내부 서비스명을 사용한다.
- Admin Web은 nginx에서 `/api`, `/ws`를 `backend:8080`으로 프록시한다.
- `stockops-client-web`은 아직 실제 앱이 없으므로 placeholder 페이지로 실행된다.
- `sensimul` publisher와 `sensimul-web`은 SQLite 동시 쓰기 잠금을 피하기 위해 로컬 Compose에서 서로 다른 SQLite 파일을 사용한다.
