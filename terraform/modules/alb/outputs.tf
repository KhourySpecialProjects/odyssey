output "alb_dns_name" {
 description = "DNS name of the ALB"
 value       = aws_lb.main.dns_name
}


output "alb_zone_id" {
 description = "Zone ID of the ALB"
 value       = aws_lb.main.zone_id
}


output "frontend_target_group_arn" {
 description = "ARN of the frontend target group"
 value       = aws_lb_target_group.frontend.arn
}


output "backend_target_group_arn" {
 description = "ARN of the backend target group"
 value       = aws_lb_target_group.backend.arn
}


output "security_group_id" {
 description = "ID of the ALB security group"
 value       = aws_security_group.alb.id
}


output "https_listener_arn" {
 description = "ARN of the HTTPS listener"
 value       = aws_lb_listener.https.arn
}
