variable "project_name" {
 description = "Project name for resource naming"
 type        = string
}


variable "private_subnet_ids" {
 description = "List of private subnet IDs for the DB subnet group"
 type        = list(string)
}


variable "rds_security_group_id" {
 description = "Security group ID for the RDS instance"
 type        = string
}


variable "allocated_storage" {
 description = "The allocated storage in gigabytes"
 type        = number
 default     = 20
}


variable "environment" {
 description = "Environment name"
 type        = string
}


variable "engine" {
 description = "The database engine to use"
 type        = string
 default     = "postgres"
}


variable "engine_version" {
 description = "The version of the database engine"
 type        = string
 default     = "13.18"
}


variable "instance_class" {
 description = "The instance type of the RDS instance"
 type        = string
 default     = "db.t3.large"
}


variable "db_username" {
 description = "Username for the master DB user"
 type        = string
}


variable "db_password" {
 description = "Password for the master DB user"
 type        = string
 sensitive   = true
}


variable "db_name" {
 description = "Name of the database to create"
 type        = string
 default     = "odyssey"
}


variable "skip_final_snapshot" {
 description = "Whether to skip the final DB snapshot when deleting"
 type        = bool
 default     = true
}
