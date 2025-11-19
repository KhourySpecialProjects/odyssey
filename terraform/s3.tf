  resource "aws_s3_bucket" "prod_data" {
    bucket = var.prod_data_bucket_name
    tags = {
      Environment = "production"
      Purpose     = "application-data"
    }
  }

  resource "aws_s3_object" "prod_data" {
    bucket = aws_s3_bucket.prod_data.id
    key = "uploads/"
  }

  resource "aws_s3_bucket_versioning" "prod_data" {
    bucket = aws_s3_bucket.prod_data.id
    versioning_configuration {
      status = "Enabled"
    }
  }

  resource "aws_s3_bucket_server_side_encryption_configuration" "prod_data" {
    bucket = aws_s3_bucket.prod_data.id
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  resource "aws_s3_bucket_public_access_block" "prod_data" {
    bucket                  = aws_s3_bucket.prod_data.id
    block_public_acls       = false
    block_public_policy     = false
    ignore_public_acls      = false
    restrict_public_buckets = false
  }

  resource "aws_s3_bucket_policy" "prod_data" {
    bucket                  = aws_s3_bucket.prod_data.id
    policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid: "AllowPublicRead"
        Effect = "Allow"
        Principal = "*"
        Action = "s3:GetObject"
        Resource = "arn:aws:s3:::odyssey-prod-bucket/*"
      }
    ]
  })
  }

  resource "aws_s3_bucket_cors_configuration" "cors_config" {
  bucket = aws_s3_bucket.prod_data.id
  cors_rule {
    allowed_headers = ["*"] 
    allowed_methods = ["GET", "POST", "PUT", "DELETE", "HEAD"] 
    allowed_origins = ["http://localhost:1337"] 
    expose_headers  = [] 
    max_age_seconds = 3000 
    id              = "my-cors-rule-1"
  }
  }