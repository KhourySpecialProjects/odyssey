# Link local state to the remote
terraform {
 backend "s3" {
   bucket         = "odyssey-terraform-state-prod"
   key            = "terraform.tfstate"
   region         = "us-east-2"
   profile        = "terraform-backend"
   dynamodb_table = "odyssey-terraform-lock"
 }
}


# Bucket for storing Terraform state
resource "aws_s3_bucket" "terraform_state" {
 bucket = "odyssey-terraform-state-prod"
}


resource "aws_s3_bucket_public_access_block" "terraform_state" {
 bucket = aws_s3_bucket.terraform_state.id


 block_public_acls       = true
 block_public_policy     = true
 ignore_public_acls      = true
 restrict_public_buckets = true
}


# Table for state locking
# resource "aws_dynamodb_table" "terraform_lock" {
#   name         = "odyssey-terraform-lock"
#   billing_mode = "PAY_PER_REQUEST"


#   hash_key = "LockID"


#   attribute {
#     name = "LockID"
#     type = "S"
#   }
# }
