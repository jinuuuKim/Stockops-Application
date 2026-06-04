# ECS Fargate deployment for stockops-api-server
# Replaces Elastic Beanstalk for container-native deployments.

resource "aws_cloudwatch_log_group" "api" {
  name              = "/stockops/${var.environment}/api"
  retention_in_days = 14
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name_prefix}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = local.api_image_uri
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "SPRING_PROFILES_ACTIVE"
          value = var.create_rds ? "prod" : "local"
        },
        {
          name  = "STOCKOPS_DATASOURCE_URL"
          value = var.create_rds ? "jdbc:postgresql://${aws_db_instance.postgres[0].address}:5432/${var.db_name}" : ""
        },
        {
          name  = "STOCKOPS_DATASOURCE_USERNAME"
          value = var.db_username
        },
        {
          name  = "STOCKOPS_CORS_ALLOWED_ORIGINS"
          value = local.cors_origins
        },
        {
          name  = "STOCKOPS_MQTT_INGESTION_ENABLED"
          value = tostring(var.enable_mqtt)
        },
        {
          name  = "STOCKOPS_ANALYTICS_ENABLED"
          value = tostring(var.stockops_analytics_enabled)
        },
        {
          name  = "STOCKOPS_AI_ENABLED"
          value = tostring(var.stockops_ai_enabled)
        },
        {
          name  = "SPRING_MAIL_HOST"
          value = var.spring_mail_host
        },
        {
          name  = "SPRING_MAIL_PORT"
          value = var.spring_mail_port
        },
        {
          name  = "MANAGEMENT_HEALTH_REDIS_ENABLED"
          value = "false"
        },
        {
          name  = "MANAGEMENT_HEALTH_MAIL_ENABLED"
          value = "false"
        }
      ]
      secrets = [
        {
          name      = "STOCKOPS_DATASOURCE_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.app.arn}:STOCKOPS_DATASOURCE_PASSWORD::"
        },
        {
          name      = "JWT_SECRET"
          valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_SECRET::"
        },
        {
          name      = "STOCKOPS_MQTT_INGESTION_BROKER_URL"
          valueFrom = "${aws_secretsmanager_secret.app.arn}:STOCKOPS_MQTT_INGESTION_BROKER_URL::"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "api"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name_prefix}-api"
  port        = 8080
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/actuator/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = local.common_tags
}

resource "aws_ecs_service" "api" {
  name            = "${local.name_prefix}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50
  }

  tags = local.common_tags
}
