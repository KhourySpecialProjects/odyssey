# terraform/modules/security_groups/outputs.tf
output "ecs_tasks_security_group_id" {
 description = "Security group ID for ECS tasks"
 value       = aws_security_group.ecs_tasks.id
}


output "rds_security_group_id" {
 value = aws_security_group.rds.id
}
