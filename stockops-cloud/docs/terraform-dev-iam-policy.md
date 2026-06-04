# Terraform dev IAM 권한

`terraform apply` 중 `tfuser`에서 `AccessDeniedException`이 발생하면, Terraform 코드 문제가 아니라 IAM 사용자 권한이 부족한 상태다.

## 현재 확인된 부족 권한

실행 로그 기준으로 다음 권한이 부족했다.

- `ecr:CreateRepository`
- `cloudfront:CreateOriginAccessControl`
- `servicediscovery:CreatePrivateDnsNamespace`

추가 apply 과정에서는 EB, ECS, RDS, IAM role, S3, CloudWatch Logs 관련 권한도 필요하다.

## 빠른 dev 테스트용 권장안

개인/실습 계정에서 빠르게 검증하는 목적이면 `tfuser`에 아래 AWS managed policy를 임시로 붙이는 방식이 가장 단순하다.

```text
AmazonEC2FullAccess
AmazonRDSFullAccess
AmazonS3FullAccess
AmazonEC2ContainerRegistryFullAccess
AWSElasticBeanstalkFullAccess
AmazonECS_FullAccess
CloudWatchLogsFullAccess
CloudFrontFullAccess
SecretsManagerReadWrite
IAMFullAccess
```

`ServiceDiscovery`는 AWS managed full-access 정책이 계정/콘솔에서 바로 보이지 않을 수 있으므로, 아래 inline policy를 추가한다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowServiceDiscoveryForDevTerraform",
      "Effect": "Allow",
      "Action": [
        "servicediscovery:*",
        "route53:GetHostedZone",
        "route53:ListHostedZonesByName",
        "route53:CreateHostedZone",
        "route53:DeleteHostedZone",
        "route53:ChangeResourceRecordSets",
        "route53:GetChange"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowPassRoleForDevTerraform",
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

## 더 안전한 우회 옵션

권한을 바로 늘릴 수 없다면 `terraform.tfvars`에서 일부 리소스를 끄고 먼저 테스트할 수 있다.

```hcl
enable_admin_cloudfront = false
enable_mqtt             = false
```

하지만 ECR repository 생성 권한이 없으면 API/Sensimul 이미지 저장소를 Terraform으로 만들 수 없다. 이 경우는 다음 중 하나를 선택해야 한다.

1. `tfuser`에 ECR 생성 권한을 부여한다.
2. ECR repository를 권한 있는 사용자로 먼저 만들고 Terraform 코드를 import/수정한다.
3. 임시로 Docker Hub 같은 외부 registry image URI를 `api_image_uri`, `sensimul_image_uri`에 지정한다.

## RDS 버전 오류

`Cannot find version 16.4 for postgres` 오류는 IAM 문제가 아니라 리전/계정에서 해당 minor version을 선택할 수 없어서 발생한다.

현재 Terraform 기본값은 `db_engine_version = ""`이며, 비워두면 AWS가 지원하는 기본 PostgreSQL minor version을 선택한다. 특정 버전을 쓰고 싶으면 먼저 사용 가능한 버전을 확인한 뒤 지정한다.

```bash
aws rds describe-db-engine-versions \
  --engine postgres \
  --region ap-northeast-2 \
  --query "DBEngineVersions[].EngineVersion"
```

## API health DOWN

`/v3/api-docs`는 200으로 응답하지만 `/actuator/health`가 `503 {"status":"DOWN"}`이면 Spring Boot Actuator health contributor 중 하나가 실패한 상태다.

현재 dev Terraform은 ElastiCache Redis를 생성하지 않는다. 따라서 Redis health check가 `localhost:6379`로 접속을 시도하면 health가 DOWN이 된다. dev EB 환경에서는 아래 환경변수로 Redis/Mail health indicator를 제외한다.

```text
MANAGEMENT_HEALTH_REDIS_ENABLED=false
MANAGEMENT_HEALTH_MAIL_ENABLED=false
```

장기 운영 환경에서는 health check를 끄는 대신 ElastiCache Redis와 SES/SMTP 설정을 실제로 연결하는 편이 맞다.
