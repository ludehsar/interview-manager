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

output "resume_state_machine_arn" {
  value = module.resume_pipeline.state_machine_arn
}

output "render_function_arn" {
  value = module.resume_pipeline.render_function_arn
}

output "embed_function_arn" {
  value = module.ingest.embed_function_arn
}

output "vercel_runtime_user" {
  value = aws_iam_user.vercel_runtime.name
}

output "opensearch_endpoint" {
  value = var.opensearch_enabled ? module.search[0].endpoint : null
}

output "opensearch_username" {
  value = var.opensearch_enabled ? module.search[0].master_username : null
}

output "opensearch_password" {
  value     = var.opensearch_enabled ? module.search[0].master_password : null
  sensitive = true
}
