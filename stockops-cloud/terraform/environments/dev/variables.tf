variable "aws_region" {
  description = "AWS region for the dev environment."
  type        = string
  default     = "ap-northeast-2"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "aws_region must be a valid AWS region format (e.g., ap-northeast-2)."
  }
}

variable "project" {
  description = "Project name used for resource naming."
  type        = string
  default     = "stockops"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project))
    error_message = "project must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.environment))
    error_message = "environment must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the dev VPC."
  type        = string
  default     = "10.40.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "vpc_cidr must be a valid CIDR block."
  }
}

variable "az_count" {
  description = "Number of availability zones to use."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 4
    error_message = "az_count must be between 2 and 4."
  }
}

variable "api_instance_type" {
  description = "Elastic Beanstalk EC2 instance type."
  type        = string
  default     = "t3.small"
}

variable "eb_solution_stack_name" {
  description = "Elastic Beanstalk AL2023 Docker solution stack name. Leave empty to select the most recent AL2023 Docker platform automatically."
  type        = string
  default     = ""
}

variable "api_image_uri" {
  description = "Optional full API Docker image URI. If empty, the dev ECR repository URL with :dev is used."
  type        = string
  default     = ""
}

variable "jwt_secret" {
  description = "JWT secret for dev. Leave empty to generate a random value."
  type        = string
  default     = ""
  sensitive   = true
}

variable "admin_allowed_origin" {
  description = "Admin web origin allowed by API CORS. Leave empty to use the generated CloudFront domain after the first apply."
  type        = string
  default     = ""
}

variable "client_allowed_origin" {
  description = "Client web origin allowed by API CORS. Leave empty until stockops-client-web is implemented."
  type        = string
  default     = ""
}

variable "create_rds" {
  description = "Whether to create RDS PostgreSQL for dev."
  type        = bool
  default     = true
}

variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "stockops"

  validation {
    condition     = can(regex("^[a-z][a-z0-9_]*$", var.db_name))
    error_message = "db_name must start with a letter and contain only lowercase letters, numbers, and underscores."
  }
}

variable "db_username" {
  description = "PostgreSQL master username."
  type        = string
  default     = "stockops"

  validation {
    condition     = can(regex("^[a-z][a-z0-9_]*$", var.db_username))
    error_message = "db_username must start with a letter and contain only lowercase letters, numbers, and underscores."
  }
}

variable "db_instance_class" {
  description = "RDS instance class for dev."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GiB."
  type        = number
  default     = 20

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 1000
    error_message = "db_allocated_storage must be between 20 and 1000 GiB."
  }
}

variable "db_engine_version" {
  description = "PostgreSQL engine version. Leave empty to let AWS choose the default supported minor version."
  type        = string
  default     = ""
}

variable "db_publicly_accessible" {
  description = "Whether the dev RDS instance should be publicly reachable. Use only for demo/dev migration."
  type        = bool
  default     = false
}

variable "db_public_access_cidrs" {
  description = "CIDR blocks allowed to connect to public dev RDS. Use a narrow /32 whenever possible."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for cidr in var.db_public_access_cidrs : can(cidrhost(cidr, 0))])
    error_message = "All entries in db_public_access_cidrs must be valid CIDR blocks."
  }
}

variable "enable_admin_cloudfront" {
  description = "Whether to create CloudFront for stockops-admin-web static hosting."
  type        = bool
  default     = true
}

variable "enable_client_cloudfront" {
  description = "Whether to create CloudFront placeholder for stockops-client-web."
  type        = bool
  default     = false
}

variable "enable_mqtt" {
  description = "Whether to create ECS Fargate Mosquitto MQTT broker."
  type        = bool
  default     = true
}

variable "mqtt_desired_count" {
  description = "Desired task count for Mosquitto broker."
  type        = number
  default     = 1

  validation {
    condition     = var.mqtt_desired_count >= 0 && var.mqtt_desired_count <= 3
    error_message = "mqtt_desired_count must be between 0 and 3."
  }
}

variable "sensimul_image_uri" {
  description = "Optional full Sensimul Docker image URI. If empty, the dev ECR repository URL with :dev is used."
  type        = string
  default     = ""
}

variable "sensimul_web_image_uri" {
  description = "Optional full Sensimul web Docker image URI. If empty, the Sensimul ECR repository URL with :web-dev is used."
  type        = string
  default     = ""
}

variable "sensimul_desired_count" {
  description = "Desired task count for Sensimul. Keep 0 until the image is pushed and config is ready."
  type        = number
  default     = 0

  validation {
    condition     = var.sensimul_desired_count >= 0
    error_message = "sensimul_desired_count must be non-negative."
  }
}

variable "sensimul_web_desired_count" {
  description = "Desired task count for the public Sensimul web UI."
  type        = number
  default     = 0

  validation {
    condition     = var.sensimul_web_desired_count >= 0
    error_message = "sensimul_web_desired_count must be non-negative."
  }
}

variable "stockops_analytics_enabled" {
  description = "Enable StockOps analytics in dev API."
  type        = bool
  default     = false
}

variable "stockops_ai_enabled" {
  description = "Enable StockOps AI features in dev API."
  type        = bool
  default     = false
}

variable "spring_mail_host" {
  description = "SMTP host used to satisfy JavaMailSender configuration."
  type        = string
  default     = "localhost"
}

variable "spring_mail_port" {
  description = "SMTP port used to satisfy JavaMailSender configuration."
  type        = string
  default     = "25"

  validation {
    condition     = can(tonumber(var.spring_mail_port)) && tonumber(var.spring_mail_port) >= 1 && tonumber(var.spring_mail_port) <= 65535
    error_message = "spring_mail_port must be a valid port number (1-65535)."
  }
}
