# ==========================================================================
# ⚙️ 윈도우 파워쉘 전용 식품 ERP 진짜 애플리케이션 통합 배포 스크립트
# ==========================================================================
$ErrorActionPreference = "Stop"

$AWS_REGION="ap-northeast-2"
$AWS_ACCOUNT_ID="247385839803" # 👈 리더님의 실제 AWS 계정 ID 반영 완료
$ECR_REPO_NAME="seoul-stockops-app-repo" # 👈 에러로그에 찍힌 실제 ECR 리포지토리명 반영 완료
$ECS_CLUSTER_NAME="seoul-cluster"
$BACKEND_SERVICE_NAME="seoul-backend-service"
$FRONTEND_SERVICE_NAME="seoul-frontend-service"

$ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "🔐 [1단계] 윈도우 환경에서 AWS ECR 인증 로그인을 토큰을 획득합니다."
Write-Host "==========================================================================" -ForegroundColor Cyan
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

Write-Host "`n==========================================================================" -ForegroundColor Green
Write-Host "⚙️ [2단계] 찐 백엔드 API 서버 빌드 및 ECR 푸시 (Platform: linux/amd64)"
Write-Host "==========================================================================" -ForegroundColor Green
docker build --platform linux/amd64 -t "${ECR_URL}:backend" ./stockops-api-server
docker push "${ECR_URL}:backend"

Write-Host "`n==========================================================================" -ForegroundColor Green
Write-Host "💻 [3단계] 찐 프론트엔드 웹 서버 빌드 및 ECR 푸시 (Platform: linux/amd64)"
Write-Host "==========================================================================" -ForegroundColor Green
docker build --platform linux/amd64 -t "${ECR_URL}:frontend" ./stockops-admin-web
docker push "${ECR_URL}:frontend"

Write-Host "`n==========================================================================" -ForegroundColor Yellow
Write-Host "🔄 [4단계] AWS ECS Fargate 서비스 신규 태스크 강제 현행화 (재배포)"
Write-Host "==========================================================================" -ForegroundColor Yellow
aws ecs update-service --cluster $ECS_CLUSTER_NAME --service $BACKEND_SERVICE_NAME --force-new-deployment --region $AWS_REGION > $null
aws ecs update-service --cluster $ECS_CLUSTER_NAME --service $FRONTEND_SERVICE_NAME --force-new-deployment --region $AWS_REGION > $null

Write-Host "`n==========================================================================" -ForegroundColor Cyan
Write-Host "🎉 [성공] 윈도우 환경에서 진짜 식품 ERP 소스코드를 AWS로 안전하게 배포했습니다!"
Write-Host "==========================================================================" -ForegroundColor Cyan