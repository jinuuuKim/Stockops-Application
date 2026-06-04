output "aws_account_id" {
  description = "AWS account ID used by this deployment."
  value       = data.aws_caller_identity.current.account_id
}

output "vpc_id" {
  description = "VPC ID."
  value       = aws_vpc.main.id
}

output "api_ecr_repository_url" {
  description = "Push stockops-api-server image here with the dev tag."
  value       = aws_ecr_repository.api.repository_url
}

output "sensimul_ecr_repository_url" {
  description = "Push Sensimul image here with the dev tag."
  value       = aws_ecr_repository.sensimul.repository_url
}

output "api_eb_environment_name" {
  description = "Elastic Beanstalk API environment name."
  value       = aws_elastic_beanstalk_environment.api.name
}

output "api_eb_cname" {
  description = "Elastic Beanstalk API CNAME."
  value       = aws_elastic_beanstalk_environment.api.cname
}

output "api_cloudfront_domain" {
  description = "HTTPS CloudFront domain for stockops-api-server."
  value       = aws_cloudfront_distribution.api.domain_name
}

output "api_cloudfront_url" {
  description = "HTTPS CloudFront URL for stockops-api-server."
  value       = "https://${aws_cloudfront_distribution.api.domain_name}"
}

output "admin_web_bucket" {
  description = "S3 bucket for stockops-admin-web build output."
  value       = aws_s3_bucket.admin.bucket
}

output "admin_cloudfront_domain" {
  description = "CloudFront domain for stockops-admin-web."
  value       = var.enable_admin_cloudfront ? aws_cloudfront_distribution.admin[0].domain_name : null
}

output "sensimul_web_url" {
  description = "Public URL for Sensimul web UI."
  value       = "http://${aws_lb.sensimul_web.dns_name}"
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint."
  value       = var.create_rds ? aws_db_instance.postgres[0].endpoint : null
}

output "secrets_manager_secret_name" {
  description = "Secrets Manager secret containing generated dev values."
  value       = aws_secretsmanager_secret.app.name
}

output "mqtt_broker_url" {
  description = "MQTT broker URL configured for the API and Sensimul."
  value       = local.mqtt_broker_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}
