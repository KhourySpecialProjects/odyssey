# terraform/variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default = "odyssey"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-2a", "us-east-2b"]
}

variable "frontend_image_url" {
  description = "ECR repository URL for frontend image"
  type        = string
  default     = "851725173181.dkr.ecr.us-east-2.amazonaws.com/odyssey-dev2-ecs-backend"
}

variable "backend_secret_arn" {
  description = "ARN of the Secrets Manager secret for backend"
  type        = string
}

variable "backend_image_url" {
  description = "ECR repository URL for backend image"
  type        = string
  default     = "851725173181.dkr.ecr.us-east-2.amazonaws.com/odyssey-dev2-ecs-backend"
}

variable "frontend_secret_arn" {
  description = "ARN of the Secrets Manager secret for frontend"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of SSL certificate for HTTPS listener"
  type        = string
}

variable "be_certificate_arn" {
  description = "ARN of SSL certificate for HTTPS listener for backend URL"
  type        = string
}

variable "frontend_target_group_arn" {
  description = "target group for frontend"
  type = string
  default = ""
}

variable "backend_target_group_arn" {
  description = "target group for backend"
  type = string
  default = ""
}

variable "alb_security_group_id" {
  description = "security group for load balancer"
  type = string
  default = ""
}

variable "database_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "odysseyadmin"
}

variable "database_password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true
}