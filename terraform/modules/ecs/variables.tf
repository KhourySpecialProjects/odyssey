# terraform/modules/ecs/variables.tf
variable "environment" {
 description = "Environment name"
 type        = string
}


variable "project_name" {
 description = "Project name"
 type        = string
 default = "odyssey"
}


variable "vpc_id" {
 description = "VPC ID"
 type        = string
}


variable "private_subnet_ids" {
 description = "List of private subnet IDs"
 type        = list(string)
}


variable "frontend_image_url" {
 description = "ECR repository URL for frontend image"
 type        = string
}


variable "frontend_secret_arn" {
 description = "ARN of the Secrets Manager secret for frontend"
 type        = string
}


variable "ecs_security_group_id" {
 description = "Security group ID for ECS tasks"
 type        = string
}


variable "backend_image_url" {
 description = "ECR repository URL for frontend image"
 type        = string
}


variable "backend_secret_arn" {
 description = "ARN of the Secrets Manager secret for frontend"
 type        = string
}


variable "alb_security_group_id" {
 description = "Security group for the load balancer for frontend and backend"
 type        = string
}


variable "frontend_target_group_arn" {
 description = "target group for the backend"
 type = string
}


variable "backend_target_group_arn" {
 description = "target group for the backend"
 type = string
}


variable "database_host" {
 description = "RDS instance host"
 type        = string
}


variable "database_port" {
 description = "RDS instance port"
 type        = number
 default     = 5432
}
