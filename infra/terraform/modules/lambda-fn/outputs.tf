output "arn" {
  value = aws_lambda_function.this.arn
}

output "name" {
  value = aws_lambda_function.this.function_name
}

output "role_name" {
  value = aws_iam_role.this.name
}

output "role_arn" {
  value = aws_iam_role.this.arn
}
