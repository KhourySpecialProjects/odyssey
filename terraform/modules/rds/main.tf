resource "aws_db_subnet_group" "this" {
 name       = "${var.project_name}-db-subnet-group"
 subnet_ids = var.private_subnet_ids


 tags = {
   Name = "${var.project_name}-db-subnet-group"
 }
}


resource "aws_db_instance" "this" {
 identifier              = "${var.project_name}-${var.environment}-db"
 allocated_storage       = var.allocated_storage
 engine                  = var.engine
 engine_version          = var.engine_version
 instance_class          = var.instance_class
 username                = var.db_username
 password                = var.db_password
 db_name                 = var.db_name
 vpc_security_group_ids  = [var.rds_security_group_id]
 db_subnet_group_name    = aws_db_subnet_group.this.name
 skip_final_snapshot     = var.skip_final_snapshot
 publicly_accessible     = false


 tags = {
   Name = "${var.project_name}-db"
 }
}
