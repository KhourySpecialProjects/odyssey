resource "aws_vpc" "main" {
 cidr_block           = "10.0.0.0/16"
 enable_dns_support   = true
 enable_dns_hostnames = true
 tags = {
   Name = "odyssey-vpc-prod"
 }
}


resource "aws_internet_gateway" "igw" {
 vpc_id = aws_vpc.main.id
 tags = {
   Name = "odyssey-igw-prod"
 }
}


# Create subnets across 3 AZs
locals {
 azs            = slice(data.aws_availability_zones.available.names, 0, 3)
 public_cidrs   = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
 private_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}


data "aws_availability_zones" "available" {}


resource "aws_subnet" "public" {
 for_each = toset(["0", "1", "2"])
 vpc_id     = aws_vpc.main.id
 cidr_block = local.public_cidrs[each.key]
 availability_zone = local.azs[each.key]
 map_public_ip_on_launch = true
 tags = {
   Name = "public-subnet-${each.key}-prod"
 }
}


resource "aws_subnet" "private" {
 for_each = toset(["0", "1", "2"])
 vpc_id     = aws_vpc.main.id
 cidr_block = local.private_cidrs[each.key]
 availability_zone = local.azs[each.key]
 map_public_ip_on_launch = false
 tags = {
   Name = "private-subnet-${each.key}-prod"
 }
}


# Routing


resource "aws_route_table" "public" {
 vpc_id = aws_vpc.main.id
 route {
   cidr_block = "0.0.0.0/0"
   gateway_id = aws_internet_gateway.igw.id
 }
 tags = {
   Name = "public-route-table-prod"
 }
}


resource "aws_route_table_association" "public" {
 for_each = aws_subnet.public
 subnet_id      = each.value.id
 route_table_id = aws_route_table.public.id
}


# NAT Gateway


resource "aws_eip" "nat" {
 domain = "vpc"
}


resource "aws_nat_gateway" "nat" {
 allocation_id = aws_eip.nat.id
 subnet_id     = aws_subnet.public[0].id # NAT in first public subnet
 tags = {
   Name = "nat-gateway-prod"
 }
}


resource "aws_route_table" "private" {
 vpc_id = aws_vpc.main.id
 route {
   cidr_block     = "0.0.0.0/0"
   nat_gateway_id = aws_nat_gateway.nat.id
 }
 tags = {
   Name = "private-route-table"
 }
}
 

resource "aws_route_table_association" "private" {
 for_each = aws_subnet.private
 subnet_id      = each.value.id
 route_table_id = aws_route_table.private.id
}
