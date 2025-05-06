# terraform/modules/security_groups/main.tf
resource "aws_security_group" "ecs_tasks" {
 name        = "${var.environment}-ecs-tasks-sg"
 description = "Security group for ECS tasks"
 vpc_id      = var.vpc_id


 egress {
   from_port   = 0
   to_port     = 0
   protocol    = "-1"
   cidr_blocks = ["0.0.0.0/0"]
 }
 ingress {
   from_port   = 0
   to_port     = 0
   protocol    = "-1"
   cidr_blocks = ["0.0.0.0/0"]
 }


 tags = {
   Name        = "${var.environment}-ecs-tasks-sg"
   Environment = var.environment
 }
}


resource "aws_security_group" "rds" {
 name        = "${var.environment}-rds-sg"
 description = "Allow DB access"
 vpc_id      = var.vpc_id


 ingress {
   from_port   = 5432
   to_port     = 5432
   protocol    = "tcp"
   security_groups = [aws_security_group.ecs_tasks.id]
 }


 egress {
   from_port   = 0
   to_port     = 0
   protocol    = "-1"
   cidr_blocks = ["0.0.0.0/0"]
 }


 tags = {
   Name = "${var.environment}-rds-sg"
 }
}
