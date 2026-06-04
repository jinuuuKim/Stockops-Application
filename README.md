# StockOps Application

K-Food 수출 기업을 모델로 한 ERP/WMS 솔루션. 4개 컴포넌트로 구성된 모노레포이며, AWS EKS(서울 리전)에 배포된다.

> 인프라(Terraform)는 별도 레포 **Stockops-Infra**에서 관리한다. 전체 아키텍처는 (https://github.com/jinuuuKim/Stockops-Infra) 참고.

---

## 구성

| 디렉토리 | 컴포넌트 | 기술 | 포트 | ALB 경로 |
|----------|----------|------|------|----------|
| `stockops-client-web` | 사용자 포털 | React + Vite + nginx | 80 | `/` |
| `stockops-admin-web` | 관리자 웹 | React + Vite + nginx | 80 | `/admin` |
| `stockops-api-server` | 메인 백엔드 | Spring Boot 3.2.12 / Java 21 | 8080 | `/api` |
| `stockops-ai-module` | AI 수요 예측 | FastAPI | 8000 | `/ai` |

---

## CI/CD

`.github/workflows/deploy.yml` — `main` 브랜치 push 시 자동 실행 (수동 실행은 `workflow_dispatch`).

```
Checkout → AWS 자격증명 → ECR 로그인
        → 4개 이미지 Build & Push (ECR)
        → kubeconfig 설정
        → kubectl rollout restart (EKS 재배포)
```

레지스트리: `247385839803.dkr.ecr.ap-northeast-2.amazonaws.com`
클러스터: `seoul-cluster` (ap-northeast-2)

> 인프라(ECR/EKS)는 Stockops-Infra에서 먼저 생성돼 있어야 한다. 이 파이프라인은 이미지를 빌드/푸시하고 재배포만 담당한다.
