# StockOps dev Terraform

이 디렉터리는 StockOps AWS dev 환경을 빠르게 생성해 배포 가능성을 테스트하기 위한 Terraform 초안입니다.

## 생성 리소스

- VPC, public/private subnet, internet gateway
- Elastic Beanstalk Docker on Amazon Linux 2023 API 환경
- API/Sensimul ECR repository
- RDS PostgreSQL
- Secrets Manager secret
- S3 + CloudFront 관리자 웹 정적 호스팅
- ECS Fargate Mosquitto MQTT broker
- ECS Fargate Sensimul service
- CloudWatch log groups

## 실행 순서

```bash
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform validate
terraform plan
```

## 첫 배포 순서

ECR repository는 Terraform이 만들지만, API와 Sensimul 이미지는 ECR repository가 생긴 뒤 push해야 한다. 따라서 첫 배포는 2단계로 진행한다.

1단계: ECR repository만 먼저 생성한다.

```bash
terraform apply \
  -target=aws_ecr_repository.api \
  -target=aws_ecr_repository.sensimul
```

출력되는 `api_ecr_repository_url`과 `sensimul_ecr_repository_url`을 확인한다.

API push:

```bash
/Users/hans/Documents/gitlab_workspace/stockops-cloud/scripts/push-api-image-dev.sh
```

Sensimul push:

```bash
/Users/hans/Documents/gitlab_workspace/stockops-cloud/scripts/push-sensimul-image-dev.sh
```

2단계: 이미지 push 후 전체 dev 환경을 생성한다.

```bash
terraform apply
```

## 관리자 웹 배포

```bash
cd /Users/hans/Documents/gitlab_workspace/stockops-admin-web
npm ci
VITE_API_BASE_URL=http://<api_eb_cname> npm run build
aws s3 sync dist s3://<admin_web_bucket> --delete
```

dev 초안은 API가 EB 기본 HTTP CNAME으로 열리므로, 브라우저 테스트 때는 CloudFront도 `http://<admin_cloudfront_domain>`으로 접속한다. 운영에서는 API에 ACM 인증서와 HTTPS 도메인을 붙이고 CloudFront도 HTTPS redirect로 변경한다.

CloudFront 캐시 무효화가 필요하면 distribution id를 AWS 콘솔 또는 CLI로 확인해 invalidation을 수행한다.

## 주의사항

- dev 환경도 비용이 발생한다. 테스트 후 `terraform destroy`로 정리한다.
- `terraform.tfvars`는 secret이 포함될 수 있으므로 커밋하지 않는다.
- EB solution stack 이름은 기본적으로 AWS에서 최신 AL2023 Docker stack을 자동 조회한다. 특정 버전으로 고정하고 싶으면 `terraform.tfvars`의 `eb_solution_stack_name`에 값을 지정한다.

```bash
aws elasticbeanstalk list-available-solution-stacks \
  --region ap-northeast-2 \
  --query "SolutionStacks[?contains(@, 'Amazon Linux 2023') && contains(@, 'Docker')]"
```

## 정리

```bash
terraform destroy
```
