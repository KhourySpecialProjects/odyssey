variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the ALB will be created"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for ALB"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ARN of SSL certificate for HTTPS listener"
  type        = string
}

variable "be_certificate_arn" {
  description = "ARN of SSL certificate for HTTPS listener for backend"
  type        = string
}

variable "frontend_port" {
  description = "Port for frontend service"
  type        = number
  default     = 3000
}

variable "backend_port" {
  description = "Port for backend service"
  type        = number
  default     = 1337
}

variable "frontend_health_check_path" {
  description = "Health check path for frontend service"
  type        = string
  default     = "/"
}

variable "backend_health_check_path" {
  description = "Health check path for backend service"
  type        = string
  default     = "/api/_health"
}

variable "health_check_interval" {
  description = "Interval between health checks (in seconds)"
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "Timeout for health checks (in seconds)"
  type        = number
  default     = 5
}

variable "health_check_healthy_threshold" {
  description = "Number of consecutive successful health checks before considering target healthy"
  type        = number
  default     = 2
}

variable "health_check_unhealthy_threshold" {
  description = "Number of consecutive failed health checks before considering target unhealthy"
  type        = number
  default     = 3
}

variable "deletion_protection" {
  description = "Enable deletion protection for the ALB"
  type        = bool
  default     = false
}

variable "ssl_policy" {
  description = "SSL policy for HTTPS listener"
  type        = string
  default     = "ELBSecurityPolicy-2016-08"
}

variable "tags" {
  description = "Additional tags for ALB resources"
  type        = map(string)
  default     = {}
}

variable "access_logs_enabled" {
  description = "Enable access logs for the ALB"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain ALB logs"
  type        = number
  default     = 30
}

variable "idle_timeout" {
  description = "The time in seconds that the connection is allowed to be idle"
  type        = number
  default     = 60
}

variable "enable_http2" {
  description = "Enable HTTP/2 on the ALB"
  type        = bool
  default     = true
}

variable "drop_invalid_header_fields" {
  description = "Indicates whether invalid header fields are dropped in application load balancers"
  type        = bool
  default     = true
}

variable "enable_cross_zone_load_balancing" {
  description = "Enable cross-zone load balancing"
  type        = bool
  default     = true
}

variable "deregistration_delay" {
  description = "Amount of time to wait for in-flight requests to complete while deregistering a target"
  type        = number
  default     = 300
}

# Security Group Variables
variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the ALB"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "additional_security_group_rules" {
  description = "List of additional security group rules for the ALB"
  type = list(object({
    type        = string
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = []
}