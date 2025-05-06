# terraform/terraform.tfvars
environment = "production"
vpc_cidr    = "10.0.0.0/16"
availability_zones = [
 "us-east-2a",
 "us-east-2b"
]


# Frontend container
frontend_image_url = "851725173181.dkr.ecr.us-east-2.amazonaws.com/odyssey-dev2-ecs-frontend"
frontend_secret_arn = "arn:aws:secretsmanager:us-east-2:851725173181:secret:odyssey/prod/frontend"


# Backend container
backend_image_url = "851725173181.dkr.ecr.us-east-2.amazonaws.com/odyssey-dev2-ecs-backend"
backend_secret_arn = "arn:aws:secretsmanager:us-east-2:851725173181:secret:odyssey/prod/backend"


certificate_arn = "arn:aws:acm:us-east-2:851725173181:certificate/1a26efdf-5050-4f5e-83b1-db6d94593499"
be_certificate_arn = "arn:aws:acm:us-east-2:851725173181:certificate/2abdecfd-4009-4d10-928e-af6e5d9e12f6"


database_username = "odysseyadmin"
database_password = "oisef?JOIJIOJoif4873!!812y8y???vddx" 
