# terraform/modules/ecs/main.tf
resource "aws_ecs_cluster" "main" {
 name = "${var.environment}-cluster"


 setting {
   name  = "containerInsights"
   value = "enabled"
 }
}


# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "frontend" {
 name              = "/ecs/production/frontend"
 retention_in_days = 30


 tags = {
   Environment = var.environment
   Project     = var.project_name
 }
}


resource "aws_cloudwatch_log_group" "backend" {
 name              = "/ecs/production/backend"
 retention_in_days = 30


 tags = {
   Environment = var.environment
   Project     = var.project_name
 }
}


# IAM roles for ECS
resource "aws_iam_role" "ecs_task_execution_role" {
 name = "${var.environment}-ecs-task-execution-role"


 assume_role_policy = jsonencode({
   Version = "2012-10-17"
   Statement = [
     {
       Action = "sts:AssumeRole"
       Effect = "Allow"
       Principal = {
         Service = "ecs-tasks.amazonaws.com"
       }
     }
   ]
 })
}


resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
 role       = aws_iam_role.ecs_task_execution_role.name
 policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}


# Add policy for Secrets Manager access
resource "aws_iam_role_policy" "secrets_access" {
 name = "${var.environment}-secrets-access"
 role = aws_iam_role.ecs_task_execution_role.id


 policy = jsonencode({
   Version = "2012-10-17"
   Statement = [
     {
       Effect = "Allow"
       Action = [
         "secretsmanager:GetSecretValue"
       ]
       Resource = [
         "arn:aws:secretsmanager:us-east-2:851725173181:secret:odyssey/prod/frontend",
         "arn:aws:secretsmanager:us-east-2:851725173181:secret:odyssey/prod/frontend-*",
         "arn:aws:secretsmanager:us-east-2:851725173181:secret:odyssey/prod/backend",
         "arn:aws:secretsmanager:us-east-2:851725173181:secret:odyssey/prod/backend-*"
       ]
     }
   ]
 })
}


# Task Definition for Frontend
resource "aws_ecs_task_definition" "frontend" {
 family                   = "${var.environment}-frontend"
 requires_compatibilities = ["FARGATE"]
 network_mode             = "awsvpc"
 cpu                      = 256
 memory                   = 512
 execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
 task_role_arn            = aws_iam_role.ecs_task_role.arn


 container_definitions = jsonencode([
   {
     name      = "frontend"
     image     = "${var.frontend_image_url}:latest"
     essential = true


     portMappings = [
       {
         hostPort      = 3000
         containerPort = 3000
         protocol      = "tcp"
       }
     ]


     secrets = [
       {
         name      = "APP_URL"
         valueFrom = "${var.frontend_secret_arn}:APP_URL::"
       },
       {
         name      = "AWS_ACCESS_KEY_ID"
         valueFrom = "${var.frontend_secret_arn}:AWS_ACCESS_KEY_ID::"
       },
       {
         name      = "AWS_CDN_URL"
         valueFrom = "${var.frontend_secret_arn}:AWS_CDN_URL::"
       },
       {
         name      = "AWS_S3_BUCKET_NAME"
         valueFrom = "${var.frontend_secret_arn}:AWS_S3_BUCKET_NAME::"
       },
       {
         name      = "AWS_S3_BUCKET_ROOT"
         valueFrom = "${var.frontend_secret_arn}:AWS_S3_BUCKET_ROOT::"
       },
       {
         name      = "AWS_S3_BUCKET_URL"
         valueFrom = "${var.frontend_secret_arn}:AWS_S3_BUCKET_URL::"
       },
       {
         name      = "AZURE_AD_CLIENT_ID"
         valueFrom = "${var.frontend_secret_arn}:AZURE_AD_CLIENT_ID::"
       },
       {
         name      = "AZURE_AD_CLIENT_SECRET"
         valueFrom = "${var.frontend_secret_arn}:AZURE_AD_CLIENT_SECRET::"
       },
       {
         name      = "AZURE_AD_TENANT_ID"
         valueFrom = "${var.frontend_secret_arn}:AZURE_AD_TENANT_ID::"
       },
       {
         name      = "GITHUB_CLIENT_ID"
         valueFrom = "${var.frontend_secret_arn}:GITHUB_CLIENT_ID::"
       },
       {
         name      = "GITHUB_CLIENT_SECRET"
         valueFrom = "${var.frontend_secret_arn}:GITHUB_CLIENT_SECRET::"
       },
       {
         name      = "NEXT_PUBLIC_APP_ENV"
         valueFrom = "${var.frontend_secret_arn}:NEXT_PUBLIC_APP_ENV::"
       },
       {
         name      = "NEXT_PUBLIC_POSTHOG_HOST"
         valueFrom = "${var.frontend_secret_arn}:NEXT_PUBLIC_POSTHOG_HOST::"
       },
       {
         name      = "NEXT_PUBLIC_POSTHOG_KEY"
         valueFrom = "${var.frontend_secret_arn}:NEXT_PUBLIC_POSTHOG_KEY::"
       },
       {
         name      = "NEXT_PUBLIC_STRAPI_API_URL"
         valueFrom = "${var.frontend_secret_arn}:STRAPI_API_URL::"
       },
       {
         name      = "NODE_ENV"
         valueFrom = "${var.frontend_secret_arn}:NODE_ENV::"
       },
       {
         name      = "PORT"
         valueFrom = "${var.frontend_secret_arn}:PORT::"
       },
       {
         name      = "POSTHOG_API_KEY"
         valueFrom = "${var.backend_secret_arn}:POSTHOG_API_KEY::"
       },
       {
         name      = "STRAPI_ACCESS_TOKEN"
         valueFrom = "${var.frontend_secret_arn}:STRAPI_ACCESS_TOKEN::"
       },
       {
         name      = "STRAPI_API_URL"
         valueFrom = "${var.frontend_secret_arn}:STRAPI_API_URL::"
       }
     ]


     logConfiguration = {
       logDriver = "awslogs"
       options = {
         "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
         "awslogs-region"        = data.aws_region.current.name
         "awslogs-stream-prefix" = "frontend"
         "awslogs-create-group"  = "true"
       }
     }
   }
 ])
}


resource "aws_ecs_task_definition" "backend" {
 family                   = "${var.environment}-backend"
 requires_compatibilities = ["FARGATE"]
 network_mode             = "awsvpc"
 cpu                      = 256
 memory                   = 512
 execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
 task_role_arn            = aws_iam_role.ecs_task_role.arn


 container_definitions = jsonencode([
   {
     name      = "backend"
     image     = "${var.backend_image_url}:latest"
     essential = true


     portMappings = [
       {
         hostPort = 1337
         containerPort = 1337
         protocol      = "tcp"
       }
     ]


     secrets = [
       {
         name      = "ADMIN_JWT_SECRET"
         valueFrom = "${var.backend_secret_arn}:ADMIN_JWT_SECRET::"
       },
       {
         name      = "API_TOKEN_SALT"
         valueFrom = "${var.backend_secret_arn}:API_TOKEN_SALT::"
       },
       {
         name      = "APP_KEYS"
         valueFrom = "${var.backend_secret_arn}:APP_KEYS::"
       },
       {
         name      = "AWS_CDN_ROOT_PATH"
         valueFrom = "${var.backend_secret_arn}:AWS_CDN_ROOT_PATH::"
       },
       {
         name      = "AWS_CDN_URL"
         valueFrom = "${var.backend_secret_arn}:AWS_CDN_URL::"
       },
       {
         name      = "AWS_S3_ACCESS_KEY"
         valueFrom = "${var.backend_secret_arn}:AWS_S3_ACCESS_KEY::"
       },
       {
         name      = "AWS_S3_BUCKET"
         valueFrom = "${var.backend_secret_arn}:AWS_S3_BUCKET::"
       },
       {
         name      = "AWS_S3_ENDPOINT"
         valueFrom = "${var.backend_secret_arn}:AWS_S3_ENDPOINT::"
       },
       {
         name      = "AWS_S3_REGION"
         valueFrom = "${var.backend_secret_arn}:AWS_S3_REGION::"
       },
       {
         name      = "AWS_S3_SECRET_KEY"
         valueFrom = "${var.backend_secret_arn}:AWS_S3_SECRET_KEY::"
       },
       {
         name      = "DATABASE_CLIENT"
         valueFrom = "${var.backend_secret_arn}:DATABASE_CLIENT::"
       },
       {
         name      = "DATABASE_HOST"
         valueFrom = "${var.backend_secret_arn}:DATABASE_HOST::"
       },
       {
         name      = "DATABASE_NAME"
         valueFrom = "${var.backend_secret_arn}:DATABASE_NAME::"
       },
       {
         name      = "DATABASE_PASSWORD"
         valueFrom = "${var.backend_secret_arn}:DATABASE_PASSWORD::"
       },
       {
         name      = "DATABASE_PORT"
         valueFrom = "${var.backend_secret_arn}:DATABASE_PORT::"
       },
       {
         name      = "DATABASE_SSL"
         valueFrom = "${var.backend_secret_arn}:DATABASE_SSL::"
       },
       {
         name      = "DATABASE_USERNAME"
         valueFrom = "${var.backend_secret_arn}:DATABASE_USERNAME::"
       },
       {
         name      = "PORT"
         valueFrom = "${var.backend_secret_arn}:PORT::"
       },
       {
         name      = "TRANSFER_TOKEN_SALT"
         valueFrom = "${var.backend_secret_arn}:TRANSFER_TOKEN_SALT::"
       }
     ]


     logConfiguration = {
       logDriver = "awslogs"
       options = {
         "awslogs-group"         = aws_cloudwatch_log_group.backend.name
         "awslogs-region"        = data.aws_region.current.name
         "awslogs-stream-prefix" = "backend"
         "awslogs-create-group"  = "true"
       }
     }
   }
 ])
}


# ECS Service for Frontend
resource "aws_ecs_service" "frontend" {
 name            = "${var.environment}-frontend"
 cluster         = aws_ecs_cluster.main.id
 task_definition = aws_ecs_task_definition.frontend.arn
 desired_count   = 1
 launch_type     = "FARGATE"


 network_configuration {
   subnets         = var.private_subnet_ids
   security_groups = [var.ecs_security_group_id]
 }


 load_balancer {
   target_group_arn = var.frontend_target_group_arn
   container_name   = "frontend"
   container_port   = 3000
 }


 deployment_controller {
   type = "ECS"
 }


 deployment_circuit_breaker {
   enable   = true
   rollback = true
 }


 tags = {
   Name        = "${var.project_name}-frontend-service-${var.environment}"
   Environment = var.environment
   Project     = var.project_name
 }
 service_registries {
   registry_arn = aws_service_discovery_service.frontend.arn
 }
}


# ECS Service for Backend
resource "aws_ecs_service" "backend" {
 name            = "${var.environment}-backend"
 cluster         = aws_ecs_cluster.main.id
 task_definition = aws_ecs_task_definition.backend.arn
 desired_count   = 1
 launch_type     = "FARGATE"


 network_configuration {
   subnets         = var.private_subnet_ids
   security_groups = [var.ecs_security_group_id]
 }


 load_balancer {
   target_group_arn = var.backend_target_group_arn
   container_name   = "backend"
   container_port   = 1337
 }


 deployment_controller {
   type = "ECS"
 }


 deployment_circuit_breaker {
   enable   = true
   rollback = true
 }


 tags = {
   Name        = "${var.project_name}-backend-service-${var.environment}"
   Environment = var.environment
   Project     = var.project_name
 }


 service_registries {
   registry_arn = aws_service_discovery_service.backend.arn
   container_name = "backend"
 }
}


# Security Groups
resource "aws_security_group" "frontend" {
 name        = "${var.project_name}-frontend-${var.environment}"
 description = "Security group for frontend ECS tasks"
 vpc_id      = var.vpc_id


 ingress {
   description     = "Allow inbound traffic from ALB"
   from_port       = 3000
   to_port         = 3000
   protocol        = "tcp"
   security_groups = [var.alb_security_group_id]
 }


 egress {
   description = "Allow all outbound traffic"
   from_port   = 0
   to_port     = 0
   protocol    = "-1"
   cidr_blocks = ["0.0.0.0/0"]
 }


 tags = {
   Name        = "${var.project_name}-frontend-sg-${var.environment}"
   Environment = var.environment
   Project     = var.project_name
 }
 }


resource "aws_security_group" "backend" {
 name        = "${var.project_name}-backend-${var.environment}"
 description = "Security group for backend ECS tasks"
 vpc_id      = var.vpc_id


 ingress {
   description     = "Allow inbound traffic from ALB"
   from_port       = 1337
   to_port         = 1337
   protocol        = "tcp"
   security_groups = [var.alb_security_group_id]
 }


 egress {
   description = "Allow all outbound traffic"
   from_port   = 0
   to_port     = 0
   protocol    = "-1"
   cidr_blocks = ["0.0.0.0/0"]
 }


 tags = {
   Name        = "${var.project_name}-backend-sg-${var.environment}"
   Environment = var.environment
   Project     = var.project_name
 }
}


# IAM Roles
resource "aws_iam_role" "ecs_execution_role" {
 name = "${var.project_name}-ecs-execution-${var.environment}"


 assume_role_policy = jsonencode({
   Version = "2012-10-17"
   Statement = [
     {
       Action = "sts:AssumeRole"
       Effect = "Allow"
       Principal = {
         Service = "ecs-tasks.amazonaws.com"
       }
     }
   ]
 })
}


resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
 role       = aws_iam_role.ecs_execution_role.name
 policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}


# Add permissions to read secrets
resource "aws_iam_role_policy" "ecs_execution_secrets" {
 name = "${var.project_name}-ecs-execution-secrets-${var.environment}"
 role = aws_iam_role.ecs_execution_role.id


 policy = jsonencode({
   Version = "2012-10-17"
   Statement = [
     {
       Effect = "Allow"
       Action = [
         "secretsmanager:GetSecretValue",
         "secretsmanager:DescribeSecret"
       ]
       Resource = [
         var.frontend_secret_arn,
         var.backend_secret_arn
       ]
     }
   ]
 })
}


resource "aws_iam_role" "ecs_task_role" {
 name = "${var.project_name}-ecs-task-${var.environment}"


 assume_role_policy = jsonencode({
   Version = "2012-10-17"
   Statement = [
     {
       Action = "sts:AssumeRole"
       Effect = "Allow"
       Principal = {
         Service = "ecs-tasks.amazonaws.com"
       }
     }
   ]
 })
}


data "aws_region" "current" {}




resource "aws_service_discovery_private_dns_namespace" "main" {
 name        = "odyssey-prod-namespace.local"
 vpc         = var.vpc_id
 description = "Namespace for internal service discovery"
}


resource "aws_service_discovery_service" "frontend" {
 name = "frontend"


 dns_config {
   namespace_id = aws_service_discovery_private_dns_namespace.main.id


   dns_records {
     type = "A"
     ttl  = 10
   }


   routing_policy = "MULTIVALUE"
 }


 health_check_custom_config {
   failure_threshold = 1
 }
}


resource "aws_service_discovery_service" "backend" {
 name = "backend"


 dns_config {
   namespace_id = aws_service_discovery_private_dns_namespace.main.id


   dns_records {
     type = "A"
     ttl  = 10
   }


   routing_policy = "MULTIVALUE"
 }


 health_check_custom_config {
   failure_threshold = 1
 }
}
