output "ingest_queue_url" {
  value = aws_sqs_queue.ingest.url
}

output "ingest_queue_arn" {
  value = aws_sqs_queue.ingest.arn
}

output "ingest_dlq_url" {
  value = aws_sqs_queue.ingest_dlq.url
}

output "embed_queue_url" {
  value = aws_sqs_queue.embed.url
}

output "dispatch_function_name" {
  value = module.dispatch.name
}

output "worker_function_name" {
  value = module.worker.name
}

output "embed_function_arn" {
  value = module.embed_rust.arn
}

output "embed_worker_function_name" {
  value = module.embed_worker.name
}
