output "endpoint" {
  value = "https://${aws_opensearch_domain.this.endpoint}"
}

output "domain_arn" {
  value = aws_opensearch_domain.this.arn
}

output "index_name" {
  value = var.index_name
}

output "master_username" {
  value = "admin"
}

output "master_password" {
  value     = random_password.master.result
  sensitive = true
}
