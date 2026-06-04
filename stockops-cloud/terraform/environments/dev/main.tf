locals {
  name_prefix = "${var.project}-${var.environment}"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  public_subnet_cidrs  = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnet_cidrs = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 20)]

  api_image_uri      = var.api_image_uri != "" ? var.api_image_uri : "${aws_ecr_repository.api.repository_url}:dev"
  sensimul_image_uri = var.sensimul_image_uri != "" ? var.sensimul_image_uri : "${aws_ecr_repository.sensimul.repository_url}:dev"
  sensimul_web_image_uri = (
    var.sensimul_web_image_uri != ""
    ? var.sensimul_web_image_uri
    : "${aws_ecr_repository.sensimul.repository_url}:web-dev"
  )

  admin_origins = (
    var.admin_allowed_origin != ""
    ? [var.admin_allowed_origin]
    : (
      var.enable_admin_cloudfront
      ? [
        "http://${aws_cloudfront_distribution.admin[0].domain_name}",
        "https://${aws_cloudfront_distribution.admin[0].domain_name}"
      ]
      : []
    )
  )
  client_origins = var.client_allowed_origin != "" ? [var.client_allowed_origin] : []

  cors_origins = join(",", concat(local.admin_origins, local.client_origins, ["http://localhost:5173"]))

  mqtt_broker_host = var.enable_mqtt ? "mqtt.${aws_service_discovery_private_dns_namespace.stockops[0].name}" : "localhost"
  mqtt_broker_url  = "tcp://${local.mqtt_broker_host}:1883"

  db_password = random_password.db.result
  jwt_secret  = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt.result
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_elastic_beanstalk_solution_stack" "docker_al2023" {
  most_recent = true
  name_regex  = "^64bit Amazon Linux 2023 .* running Docker$"
}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "random_password" "db" {
  length  = 24
  special = false
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

resource "aws_subnet" "public" {
  count = var.az_count

  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${local.name_prefix}-private-${count.index + 1}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = var.az_count

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "api_instance" {
  name        = "${local.name_prefix}-api-instance-sg"
  description = "StockOps API Elastic Beanstalk instance security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from VPC load balancer"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-api-instance-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "StockOps PostgreSQL security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from API"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api_instance.id, aws_security_group.ecs_tasks.id]
  }

  dynamic "ingress" {
    for_each = var.db_publicly_accessible && length(var.db_public_access_cidrs) > 0 ? [1] : []

    content {
      description = "PostgreSQL public dev access"
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      cidr_blocks = var.db_public_access_cidrs
    }
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-rds-sg"
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${local.name_prefix}-ecs-tasks-sg"
  description = "StockOps ECS task security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "MQTT from VPC"
    from_port   = 1883
    to_port     = 1883
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    description = "Sensimul web UI from VPC"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    description     = "Sensimul web UI from public load balancer"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.public_web.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-ecs-tasks-sg"
  }
}

resource "aws_security_group" "public_web" {
  name        = "${local.name_prefix}-public-web-sg"
  description = "Public web load balancer security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-public-web-sg"
  }
}

resource "aws_ecr_repository" "api" {
  name                 = "${local.name_prefix}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  force_delete = true
}

resource "aws_ecr_repository" "sensimul" {
  name                 = "${local.name_prefix}-sensimul"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  force_delete = true
}

resource "aws_s3_bucket" "artifacts" {
  bucket        = "${local.name_prefix}-artifacts-${random_id.suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "api_dockerrun" {
  bucket       = aws_s3_bucket.artifacts.id
  key          = "elasticbeanstalk/api/Dockerrun.aws.json"
  content_type = "application/json"

  content = jsonencode({
    AWSEBDockerrunVersion = "1"
    Image = {
      Name   = local.api_image_uri
      Update = "true"
    }
    Ports = [
      {
        ContainerPort = 8080
      }
    ]
  })
}

resource "aws_iam_role" "eb_ec2" {
  name = "${local.name_prefix}-eb-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eb_web_tier" {
  role       = aws_iam_role.eb_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier"
}

resource "aws_iam_role_policy_attachment" "eb_ecr_read" {
  role       = aws_iam_role.eb_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "eb_cloudwatch" {
  role       = aws_iam_role.eb_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "eb_ec2" {
  name = "${local.name_prefix}-eb-ec2-profile"
  role = aws_iam_role.eb_ec2.name
}

resource "aws_elastic_beanstalk_application" "api" {
  name        = "${local.name_prefix}-api"
  description = "StockOps API ${var.environment}"
}

resource "aws_elastic_beanstalk_application_version" "api" {
  name        = "dev-${aws_s3_object.api_dockerrun.etag}"
  application = aws_elastic_beanstalk_application.api.name
  bucket      = aws_s3_bucket.artifacts.id
  key         = aws_s3_object.api_dockerrun.key
}

resource "aws_elastic_beanstalk_environment" "api" {
  name                = "${local.name_prefix}-api"
  application         = aws_elastic_beanstalk_application.api.name
  solution_stack_name = var.eb_solution_stack_name != "" ? var.eb_solution_stack_name : data.aws_elastic_beanstalk_solution_stack.docker_al2023.name
  version_label       = aws_elastic_beanstalk_application_version.api.name

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "EnvironmentType"
    value     = "LoadBalanced"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = aws_iam_instance_profile.eb_ec2.name
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = var.api_instance_type
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = aws_security_group.api_instance.id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = aws_vpc.main.id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", aws_subnet.public[*].id)
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "ELBSubnets"
    value     = join(",", aws_subnet.public[*].id)
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Port"
    value     = "8080"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Protocol"
    value     = "HTTP"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckPath"
    value     = "/actuator/health"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SPRING_PROFILES_ACTIVE"
    value     = var.create_rds ? "prod" : "local"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "STOCKOPS_DATASOURCE_URL"
    value     = var.create_rds ? "jdbc:postgresql://${aws_db_instance.postgres[0].address}:5432/${var.db_name}" : ""
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "STOCKOPS_DATASOURCE_USERNAME"
    value     = var.db_username
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "STOCKOPS_DATASOURCE_PASSWORD"
    value     = local.db_password
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "JWT_SECRET"
    value     = local.jwt_secret
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "STOCKOPS_CORS_ALLOWED_ORIGINS"
    value     = local.cors_origins
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "STOCKOPS_MQTT_INGESTION_ENABLED"
    value     = tostring(var.enable_mqtt)
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "STOCKOPS_MQTT_INGESTION_BROKER_URL"
    value     = local.mqtt_broker_url
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "STOCKOPS_ANALYTICS_ENABLED"
    value     = tostring(var.stockops_analytics_enabled)
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "STOCKOPS_AI_ENABLED"
    value     = tostring(var.stockops_ai_enabled)
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SPRING_MAIL_HOST"
    value     = var.spring_mail_host
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SPRING_MAIL_PORT"
    value     = var.spring_mail_port
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "MANAGEMENT_HEALTH_REDIS_ENABLED"
    value     = "false"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "MANAGEMENT_HEALTH_MAIL_ENABLED"
    value     = "false"
  }
}

resource "aws_db_subnet_group" "postgres" {
  count = var.create_rds ? 1 : 0

  name       = "${local.name_prefix}-postgres"
  subnet_ids = var.db_publicly_accessible ? aws_subnet.public[*].id : aws_subnet.private[*].id

  tags = {
    Name = "${local.name_prefix}-postgres"
  }
}

resource "aws_db_instance" "postgres" {
  count = var.create_rds ? 1 : 0

  identifier             = "${local.name_prefix}-postgres"
  engine                 = "postgres"
  engine_version         = var.db_engine_version != "" ? var.db_engine_version : null
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  db_name                = var.db_name
  username               = var.db_username
  password               = local.db_password
  db_subnet_group_name   = aws_db_subnet_group.postgres[0].name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = var.db_publicly_accessible
  skip_final_snapshot    = true
  deletion_protection    = false
  storage_encrypted      = true

  backup_retention_period = 1
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name_prefix}/app"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    JWT_SECRET                         = local.jwt_secret
    STOCKOPS_DATASOURCE_USERNAME       = var.db_username
    STOCKOPS_DATASOURCE_PASSWORD       = local.db_password
    STOCKOPS_MQTT_INGESTION_BROKER_URL = local.mqtt_broker_url
  })
}

resource "aws_s3_bucket" "admin" {
  bucket        = "${local.name_prefix}-admin-web-${random_id.suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "admin" {
  bucket = aws_s3_bucket.admin.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "client" {
  count = var.enable_client_cloudfront ? 1 : 0

  bucket        = "${local.name_prefix}-client-web-${random_id.suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "client" {
  count = var.enable_client_cloudfront ? 1 : 0

  bucket = aws_s3_bucket.client[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "admin" {
  count = var.enable_admin_cloudfront ? 1 : 0

  name                              = "${local.name_prefix}-admin-oac"
  description                       = "OAC for StockOps admin web"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "admin" {
  count = var.enable_admin_cloudfront ? 1 : 0

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_200"

  origin {
    domain_name              = aws_s3_bucket.admin.bucket_regional_domain_name
    origin_id                = "admin-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.admin[0].id
  }

  default_cache_behavior {
    target_origin_id       = "admin-s3"
    viewer_protocol_policy = "allow-all"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_cloudfront_distribution" "api" {
  enabled         = true
  is_ipv6_enabled = true
  price_class     = "PriceClass_200"

  origin {
    domain_name = aws_elastic_beanstalk_environment.api.cname
    origin_id   = "api-eb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "api-eb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.common_tags
}

resource "aws_s3_bucket_policy" "admin_cloudfront" {
  count = var.enable_admin_cloudfront ? 1 : 0

  bucket = aws_s3_bucket.admin.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontRead"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.admin.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.admin[0].arn
          }
        }
      }
    ]
  })
}

resource "aws_lb" "sensimul_web" {
  name               = "${local.name_prefix}-sensimul-web"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.public_web.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${local.name_prefix}-sensimul-web"
  }
}

resource "aws_lb_target_group" "sensimul_web" {
  name        = "${local.name_prefix}-sensimul-web"
  port        = 8080
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/healthz"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${local.name_prefix}-sensimul-web"
  }
}

resource "aws_lb_listener" "sensimul_web" {
  load_balancer_arn = aws_lb.sensimul_web.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.sensimul_web.arn
  }
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"
}

resource "aws_cloudwatch_log_group" "mqtt" {
  count = var.enable_mqtt ? 1 : 0

  name              = "/stockops/${var.environment}/mqtt"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "sensimul" {
  name              = "/stockops/${var.environment}/sensimul"
  retention_in_days = 7
}

resource "aws_iam_role" "ecs_task_execution" {
  name = "${local.name_prefix}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_service_discovery_private_dns_namespace" "stockops" {
  count = var.enable_mqtt ? 1 : 0

  name        = "${local.name_prefix}.local"
  description = "StockOps dev private namespace"
  vpc         = aws_vpc.main.id
}

resource "aws_service_discovery_service" "mqtt" {
  count = var.enable_mqtt ? 1 : 0

  name = "mqtt"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.stockops[0].id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_ecs_task_definition" "mqtt" {
  count = var.enable_mqtt ? 1 : 0

  family                   = "${local.name_prefix}-mqtt"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "mqtt"
      image     = "eclipse-mosquitto:2"
      essential = true
      command   = ["sh", "-c", "printf 'listener 1883 0.0.0.0\\nallow_anonymous true\\n' > /tmp/mosquitto.conf && mosquitto -c /tmp/mosquitto.conf"]
      portMappings = [
        {
          containerPort = 1883
          hostPort      = 1883
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.mqtt[0].name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "mqtt"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "mqtt" {
  count = var.enable_mqtt ? 1 : 0

  name            = "${local.name_prefix}-mqtt"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.mqtt[0].arn
  desired_count   = var.mqtt_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.mqtt[0].arn
  }
}

resource "aws_ecs_task_definition" "sensimul" {
  family                   = "${local.name_prefix}-sensimul"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "sensimul"
      image     = local.sensimul_image_uri
      essential = true
      environment = [
        {
          name  = "SENSIMUL_MQTT_BROKER_URL"
          value = local.mqtt_broker_url
        },
        {
          name  = "SENSIMUL_MQTT_CLIENT_ID"
          value = "${local.name_prefix}-sensimul-runner"
        },
        {
          name  = "SENSIMUL_MODE"
          value = "dev"
        },
        {
          name  = "SENSIMUL_SITE_ID"
          value = "SEOUL_COLD_CHAIN_01"
        },
        {
          name  = "SENSIMUL_TICK_INTERVAL"
          value = "5s"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.sensimul.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "sensimul"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "sensimul" {
  name            = "${local.name_prefix}-sensimul"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.sensimul.arn
  desired_count   = var.sensimul_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
}

resource "aws_ecs_task_definition" "sensimul_web" {
  family                   = "${local.name_prefix}-sensimul-web"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "sensimul-web"
      image     = local.sensimul_web_image_uri
      essential = true
      environment = [
        {
          name  = "SENSIMUL_MQTT_BROKER_URL"
          value = local.mqtt_broker_url
        },
        {
          name  = "SENSIMUL_MQTT_CLIENT_ID"
          value = "${local.name_prefix}-sensimul-web"
        },
        {
          name  = "SENSIMUL_MODE"
          value = "dev"
        },
        {
          name  = "SENSIMUL_SITE_ID"
          value = "SEOUL_COLD_CHAIN_01"
        },
        {
          name  = "SENSIMUL_WEB_LISTEN_ADDR"
          value = ":8080"
        }
      ]
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.sensimul.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "sensimul-web"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "sensimul_web" {
  name            = "${local.name_prefix}-sensimul-web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.sensimul_web.arn
  desired_count   = var.sensimul_web_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.sensimul_web.arn
    container_name   = "sensimul-web"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.sensimul_web]
}
