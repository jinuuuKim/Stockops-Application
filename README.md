# StockOps Application

![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-%236DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-%23009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-%2361DAFB?style=for-the-badge&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-%230db7ed?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-%232088FF?style=for-the-badge&logo=githubactions&logoColor=white)

K-Food 수출 기업을 모델로 한 ERP/WMS 솔루션 StockOps의 애플리케이션 모노레포입니다.  
인프라(Terraform IaC)는 **[Stockops-Infra](https://github.com/jinuuuKim/Stockops-Infra)** 에서, K8s 배포 manifest는 **[Stockops-GitOps](https://github.com/jinuuuKim/Stockops-GitOps)** 에서 관리합니다.

---

## 구성 컴포넌트

| 디렉토리 | 컴포넌트 | 기술 스택 | 서빙 경로 |
|----------|----------|-----------|-----------|
| `stockops-client-web` | 사용자 포털 | React + Vite | `siseon.live` → CloudFront → S3 |
| `stockops-admin-web` | 관리자 웹 | React + Vite | `app.siseon.live` → CloudFront → S3 |
| `stockops-api-server` | 메인 백엔드 | Spring Boot 3.2 / Java 21 | `api.siseon.live` → GA → ALB `/api/*`, `/ws/*` |
| `stockops-ai-module` | AI 수요 예측 | FastAPI / Python | `api.siseon.live` → GA → ALB `/ai/*` |
| `sensimul` | IoT 센서 시뮬레이터 | Go 1.23+ | 온프레미스 MQTT 발행 |

> client-web · admin-web은 정적 빌드 결과물을 S3에 업로드하고 CloudFront로 서빙합니다. EKS에는 배포되지 않습니다.

---

## CI/CD 파이프라인

`main` 브랜치 push(또는 `workflow_dispatch`) 시 `.github/workflows/deploy.yml`이 자동 실행됩니다.

```
Checkout (submodules: recursive)
  │
  ├─ [정적] client-web / admin-web
  │    └─ Node.js 20 · npm ci · Vite 빌드
  │         └─ aws s3 sync --delete → CloudFront create-invalidation
  │
  └─ [동적] api-server / ai-module
       ├─ Docker 빌드 (SHA 태그)
       ├─ 서울 ECR + 오하이오 ECR 직접 push (GitHub OIDC — 액세스 키 없음)
       └─ Stockops-GitOps kustomization.yaml 이미지 SHA 업데이트 commit
            └─ ArgoCD 자동 감지 → 서울/오하이오 클러스터 각각 sync
```

### ECR 레지스트리

| 리전 | 레지스트리 |
|------|-----------|
| 서울 (`ap-northeast-2`) | `448768137813.dkr.ecr.ap-northeast-2.amazonaws.com` |
| 오하이오 (`us-east-2`) | `448768137813.dkr.ecr.us-east-2.amazonaws.com` |

ECR은 리전별 독립 리포로 운영합니다 (CRR 미사용). CI가 양 리전에 직접 push하므로 리전별 독립 롤백이 가능합니다.

### GitHub Actions에 필요한 Secrets / Variables

| 이름 | 용도 |
|------|------|
| `GITOPS_TOKEN` | Stockops-GitOps 레포에 이미지 SHA commit을 push하는 PAT |

> AWS 자격증명은 OIDC (`role-to-assume: github-actions-ecr-push`)로 처리합니다. 액세스 키를 저장하지 않습니다.

---

## 로컬 개발 환경

각 컴포넌트의 로컬 실행 방법은 해당 디렉토리의 README를 참고하세요.

- **api-server**: `./gradlew bootRun` (Java 21 필요)
- **ai-module**: `uvicorn main:app --reload` (Python 3.11+ 필요)
- **client-web / admin-web**: `npm install && npm run dev`
- **sensimul**: `go run .`

---

## 서브모듈 업데이트

각 컴포넌트는 독립된 git 레포를 서브모듈로 참조합니다. 서브모듈 변경 사항을 반영하려면:

```bash
# 서브모듈 최신 커밋으로 갱신 후 push → deploy.yml 자동 트리거
git submodule update --remote --merge
git add .
git commit -m "chore: sync submodules"
git push
```
