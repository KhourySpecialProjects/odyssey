# terraform/modules/security_groups/variables.tf
variable "environment" {
 description = "Environment name"
 type        = string
}


variable "vpc_id" {
 description = "VPC ID"
 type        = string
}
