# terraform/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}


provider "aws" {
  region = "us-east-2"
  profile = "Odyssey-FullAdmin-851725173181" 

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

module "vpc" {
  source = "./modules/vpc"
}

module "alb" {
  source = "./modules/alb"

  project_name      = var.project_name
  environment      = var.environment
  vpc_id           = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn  = var.certificate_arn
  be_certificate_arn = var.be_certificate_arn
  backend_health_check_path = "/"
}

# Create ECS cluster and services
module "ecs" {
  source = "./modules/ecs"

  project_name    = var.project_name
  environment    = var.environment
  vpc_id         = module.vpc.vpc_id 
  
  private_subnet_ids    = module.vpc.private_subnet_ids  
  frontend_image_url    = var.frontend_image_url
  frontend_secret_arn   = var.frontend_secret_arn
  backend_image_url    = var.backend_image_url
  backend_secret_arn   = var.backend_secret_arn
  ecs_security_group_id = module.security_groups.ecs_tasks_security_group_id
  frontend_target_group_arn = module.alb.frontend_target_group_arn
  backend_target_group_arn  = module.alb.backend_target_group_arn
  alb_security_group_id     = module.alb.security_group_id
  database_host = module.rds.db_instance_address
}

module "security_groups" {
  source = "./modules/security_groups"
  
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

module "rds" {
  source                = "./modules/rds"
  project_name          = var.project_name
  private_subnet_ids    = module.vpc.private_subnet_ids
  rds_security_group_id = module.security_groups.rds_security_group_id
  db_username           = var.database_username
  db_password           = var.database_password
  db_name               = "odyssey"
  environment = var.environment
}
