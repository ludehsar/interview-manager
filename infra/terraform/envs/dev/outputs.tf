output "bucket" {
  value = module.storage.bucket
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "vercel_runtime_role_arn" {
  value = var.vercel_team_slug == "" ? null : aws_iam_role.vercel_runtime[0].arn
}

output "ingest_queue_url" {
  value = module.ingest.ingest_queue_url
}

output "ingest_dlq_url" {
  value = module.ingest.ingest_dlq_url
}

output "embed_queue_url" {
  value = module.ingest.embed_queue_url
}

output "ingest_dispatch_function" {
  value = module.ingest.dispatch_function_name
}

output "ingest_worker_function" {
  value = module.ingest.worker_function_name
}
