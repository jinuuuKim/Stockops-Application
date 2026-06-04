# stockops-cloud

StockOps 재고 관리 시스템의 AWS 배포 문서와 IaC 초안 저장소입니다.

현재 초안은 **dev 환경 배포 테스트**를 목표로 합니다. 운영 최종형이 아니라, AWS 리소스가 정상 생성되고 각 애플리케이션을 연결할 수 있는지 확인하기 위한 Terraform 기반 구성입니다.

## 구성 대상

| 프로젝트 | 역할 | 배포 방향 |
|---|---|---|
| `stockops-api-server` | Spring Boot 백엔드 API | Elastic Beanstalk Docker on Amazon Linux 2023 |
| `stockops-admin-web` | 관리자 웹 | S3 + CloudFront 정적 호스팅 |
| `Sensimul` | 센서 데이터 시뮬레이터 | ECS Fargate task/service |
| MQTT broker | 센서 메시지 브로커 | ECS Fargate Mosquitto |
| `stockops-client-web` | 향후 매장/기관용 웹 | S3 + CloudFront placeholder |
| DB | 운영 데이터 저장 | RDS PostgreSQL |

## 디렉터리

```text
.
├── README.md
├── docs/
│   └── StockOps_AWS_Deployment_Plan_2026-05-14.md
└── terraform/
    └── environments/
        └── dev/
            ├── README.md
            ├── main.tf
            ├── outputs.tf
            ├── terraform.tfvars.example
            ├── variables.tf
            └── versions.tf
```

## dev Terraform 개요

`terraform/environments/dev`는 다음 AWS 리소스를 생성합니다.

- VPC, public/private subnet, route table, internet gateway
- Elastic Beanstalk application/environment
- API Docker 배포용 ECR repository
- EB Dockerrun artifact 저장용 S3 bucket
- RDS PostgreSQL
- Secrets Manager secret
- Admin web 정적 호스팅용 S3 bucket + CloudFront
- Client web placeholder S3 bucket + CloudFront
- ECS cluster
- Mosquitto MQTT broker task/service
- Sensimul ECR repository, task/service
- CloudWatch log groups

## 사전 준비

1. AWS CLI 인증을 준비합니다.

```bash
aws sts get-caller-identity
```

2. Terraform을 설치합니다.

```bash
terraform version
```

3. API와 Sensimul Docker image를 ECR에 push할 준비를 합니다.

이 Terraform 초안은 인프라 생성을 담당합니다. 실제 애플리케이션 이미지는 ECR에 `:dev` 태그로 push한 뒤 EB/ECS가 그 이미지를 가져가는 방식입니다.

## 로컬 Docker 통합 실행

수정/추가 개발을 위해 모든 관련 프로젝트를 로컬 Docker Compose로 함께 실행할 수 있습니다.

```bash
docker compose -f docker-compose.local.yml up --build
```

접속:

```text
Admin Web:    http://localhost:8081
API Health:   http://localhost:8080/actuator/health
API Docs:     http://localhost:8080/swagger-ui.html
Sensimul Web: http://localhost:18080
Client Web:   http://localhost:8082
MailHog:      http://localhost:8025
MQTT:         localhost:1883
```

자세한 내용은 [로컬 Docker Compose 실행 문서](docs/local-docker-compose.md)를 참고합니다.

## dev 배포 테스트

```bash
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform validate
terraform plan
```

처음에는 ECR repository만 먼저 만든다. API/센서 이미지를 push하기 전 전체 apply를 실행하면 EB/ECS가 아직 없는 이미지를 pull하려고 시도할 수 있다.

```bash
terraform apply \
  -target=aws_ecr_repository.api \
  -target=aws_ecr_repository.sensimul
```

그 다음 API/Sensimul 이미지를 ECR에 push하고 전체 dev 환경을 생성한다.

```bash
./scripts/push-api-image-dev.sh
./scripts/push-sensimul-image-dev.sh
```

```bash
terraform apply
```

테스트 후 비용 정리:

```bash
terraform destroy
```

## S3 아티팩트 패키징/업로드

로컬 프로젝트 소스를 S3에 올릴 수 있는 배포 아티팩트 형식으로 묶으려면 다음 스크립트를 사용합니다.

```bash
./scripts/package-dev-artifacts.sh
```

생성되는 기본 아티팩트:

- `api/stockops-api-server-eb-source.zip`: Elastic Beanstalk Docker source bundle
- `api/stockops-api-server-dockerrun.zip`: `API_IMAGE_URI`를 지정했을 때 생성되는 EB Dockerrun bundle
- `admin-web/stockops-admin-web-static.zip`: S3/CloudFront 정적 웹 배포 번들
- `sensimul/sensimul-docker-source.zip`: Sensimul Docker build용 source bundle
- `client-web/stockops-client-web-placeholder.zip`: 아직 미구현인 client web placeholder

S3 업로드:

```bash
./scripts/upload-dev-artifacts-to-s3.sh <s3-bucket> stockops/dev/artifacts
```

관리자 웹을 실제 정적 사이트 버킷에 바로 반영하려면:

```bash
VITE_API_BASE_URL=http://<api_eb_cname> \
  ./scripts/sync-admin-web-to-s3.sh <admin_web_bucket>
```

## 주의사항

- dev 환경도 RDS, CloudFront, EB, ECS 리소스가 생성되므로 비용이 발생합니다.
- `terraform.tfvars`에는 실제 secret 값을 직접 커밋하지 않습니다.
- 첫 배포 전 `stockops-api-server` 이미지를 ECR에 push해야 EB API 환경이 정상 기동됩니다.
- `Sensimul` 이미지를 push하지 않은 상태에서 `sensimul_desired_count`를 1 이상으로 두면 ECS task가 이미지 pull 실패로 재시작될 수 있습니다.
- 기본 구조는 빠른 테스트용 public subnet 배포입니다. 운영 환경에서는 private app subnet + NAT Gateway 또는 VPC endpoint 구성을 별도로 설계하는 것이 좋습니다.

## 참고 문서

- [배포 계획 문서](docs/StockOps_AWS_Deployment_Plan_2026-05-14.md)
- [dev 배포 구조 시각화 HTML](docs/stockops-dev-architecture.html)
