output "cluster_id" {
 description = "ID of the ECS cluster"
 value       = aws_ecs_cluster.main.id
}


output "cluster_name" {
 description = "Name of the ECS cluster"
 value       = aws_ecs_cluster.main.name
}


output "frontend_service_name" {
 description = "Name of the frontend ECS service"
 value       = aws_ecs_service.frontend.name
}


output "backend_service_name" {
 description = "Name of the backend ECS service"
 value       = aws_ecs_service.backend.name
}


output "frontend_security_group_id" {
 description = "ID of the frontend security group"
 value       = aws_security_group.frontend.id
}


output "backend_security_group_id" {
 description = "ID of the backend security group"
 value       = aws_security_group.backend.id
}


output "task_execution_role_arn" {
 description = "ARN of the ECS task execution role"
 value       = aws_iam_role.ecs_execution_role.arn
}
