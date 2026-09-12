output "bucket" {
  value = module.storage.bucket
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "vercel_runtime_role_arn" {
  value = var.vercel_team_slug == "" ? null : aws_iam_role.vercel_runtime[0].arn
}
