# Application Load Balancer
resource "aws_lb" "main" {
 name               = "${var.project_name}-${var.environment}"
 internal           = false
 load_balancer_type = "application"
 security_groups    = [aws_security_group.alb.id]
 subnets           = var.public_subnet_ids


 enable_deletion_protection = var.environment == "prod"


 tags = {
   Name        = "${var.project_name}-alb-${var.environment}"
   Environment = var.environment
   Project     = var.project_name
 }
}


# Frontend target group
resource "aws_lb_target_group" "frontend" {
 name        = "${var.project_name}-fe-${var.environment}"
 port        = 3000
 protocol    = "HTTP"
 vpc_id      = var.vpc_id
 target_type = "ip"


 health_check {
   enabled             = true
   healthy_threshold   = 2
   interval            = 30
   matcher            = "200"
   path               = "/"
   port               = "traffic-port"
   protocol           = "HTTP"
   timeout            = 5
   unhealthy_threshold = 3
 }


 tags = {
   Name        = "${var.project_name}-fe-tg-${var.environment}"
   Environment = var.environment
   Project     = var.project_name
 }
}


# Backend target group
resource "aws_lb_target_group" "backend" {
 name        = "${var.project_name}-be-${var.environment}"
 port        = 1337
 protocol    = "HTTP"
 vpc_id      = var.vpc_id
 target_type = "ip"


 health_check {
   enabled             = true
   healthy_threshold   = 2
   interval            = 30
   matcher            = "200"
   path               = "/api/_health"
   port               = "traffic-port"
   protocol           = "HTTP"
   timeout            = 5
   unhealthy_threshold = 3
 }


 tags = {
   Name        = "${var.project_name}-be-tg-${var.environment}"
   Environment = var.environment
   Project     = var.project_name
 }
}


# HTTPS Listener
resource "aws_lb_listener" "https" {
 load_balancer_arn = aws_lb.main.arn
 port              = "443"
 protocol          = "HTTPS"
 ssl_policy        = "ELBSecurityPolicy-2016-08"
 certificate_arn   = var.certificate_arn


 default_action {
   type             = "forward"
   target_group_arn = aws_lb_target_group.frontend.arn
 }
}


resource "aws_lb_listener_certificate" "sni_cert" {
 listener_arn = aws_lb_listener.https.arn
 certificate_arn = var.be_certificate_arn
}


# HTTP Listener - Redirects to HTTPS
resource "aws_lb_listener" "http" {
 load_balancer_arn = aws_lb.main.arn
 port              = "80"
 protocol          = "HTTP"


 default_action {
   type = "redirect"


   redirect {
     port        = "443"
     protocol    = "HTTPS"
     status_code = "HTTP_301"
   }
 }
}


# Backend listener rule - Routes /api/* to backend service
resource "aws_lb_listener_rule" "backend" {
 listener_arn = aws_lb_listener.https.arn
 priority     = 100


 action {
   type             = "forward"
   target_group_arn = aws_lb_target_group.backend.arn
 }


 condition {
   host_header {
     values = ["www.data.khouryodyssey.org"]
   }
 }
}


# ALB Security Group
resource "aws_security_group" "alb" {
 name        = "${var.project_name}-alb-${var.environment}"
 description = "Security group for ALB"
 vpc_id      = var.vpc_id


 ingress {
   description = "Allow HTTP from anywhere"
   from_port   = 80
   to_port     = 80
   protocol    = "tcp"
   cidr_blocks = ["0.0.0.0/0"]
 }


 ingress {
   description = "Allow HTTPS from anywhere"
   from_port   = 443
   to_port     = 443
   protocol    = "tcp"
   cidr_blocks = ["0.0.0.0/0"]
 }


 egress {
   description = "Allow all outbound traffic"
   from_port   = 0
   to_port     = 0
   protocol    = "-1"
   cidr_blocks = ["0.0.0.0/0"]
 }


 tags = {
   Name        = "${var.project_name}-alb-sg-${var.environment}"
   Environment = var.environment
   Project     = var.project_name
 }
}


# CloudWatch Log Group for ALB access logs
resource "aws_cloudwatch_log_group" "alb" {
 name              = "/aws/alb/${var.project_name}-${var.environment}"
 retention_in_days = var.environment == "prod" ? 30 : 7


 tags = {
   Environment = var.environment
   Project     = var.project_name
 }
}
