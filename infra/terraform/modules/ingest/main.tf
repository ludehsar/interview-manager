data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  ssm_arn_prefix = "arn:aws:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_prefix}"
}

resource "aws_sqs_queue" "ingest_dlq" {
  name                      = "${var.name_prefix}-ingest-dlq"
  message_retention_seconds = 1209600
  tags                      = var.tags
}

resource "aws_sqs_queue" "ingest" {
  name                       = "${var.name_prefix}-ingest"
  visibility_timeout_seconds = var.worker_timeout_s * 6
  message_retention_seconds  = 345600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ingest_dlq.arn
    maxReceiveCount     = 3
  })

  tags = var.tags
}

resource "aws_sqs_queue_redrive_allow_policy" "ingest_dlq" {
  queue_url = aws_sqs_queue.ingest_dlq.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.ingest.arn]
  })
}

resource "aws_sqs_queue" "embed_dlq" {
  name                      = "${var.name_prefix}-embed-dlq"
  message_retention_seconds = 1209600
  tags                      = var.tags
}

resource "aws_sqs_queue" "embed" {
  name                       = "${var.name_prefix}-embed"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 345600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.embed_dlq.arn
    maxReceiveCount     = 3
  })

  tags = var.tags
}

locals {
  shared_environment = merge(var.lambda_environment, {
    INGEST_QUEUE_URL = aws_sqs_queue.ingest.url
    EMBED_QUEUE_URL  = aws_sqs_queue.embed.url
  })

  ssm_read_statement = {
    actions   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath", "kms:Decrypt"]
    resources = ["${local.ssm_arn_prefix}/*", "${local.ssm_arn_prefix}*"]
  }
}

module "dispatch" {
  source = "../lambda-fn"

  name               = "${var.name_prefix}-ingest-dispatch"
  source_dir         = "${var.dist_dir}/ingest-dispatch"
  memory_mb          = 512
  timeout_s          = 60
  log_retention_days = var.log_retention_days
  environment        = local.shared_environment
  tags               = var.tags

  policy_statements = [
    {
      actions   = ["sqs:SendMessage", "sqs:SendMessageBatch", "sqs:GetQueueAttributes"]
      resources = [aws_sqs_queue.ingest.arn]
    },
    local.ssm_read_statement,
  ]
}

module "worker" {
  source = "../lambda-fn"

  name               = "${var.name_prefix}-ingest-worker"
  source_dir         = "${var.dist_dir}/ingest-worker"
  memory_mb          = var.worker_memory_mb
  timeout_s          = var.worker_timeout_s
  log_retention_days = var.log_retention_days
  environment        = local.shared_environment
  tags               = var.tags

  policy_statements = [
    {
      actions = [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:ChangeMessageVisibility",
      ]
      resources = [aws_sqs_queue.ingest.arn]
    },
    {
      actions   = ["sqs:SendMessage", "sqs:SendMessageBatch"]
      resources = [aws_sqs_queue.embed.arn]
    },
    local.ssm_read_statement,
  ]
}

resource "aws_lambda_event_source_mapping" "worker" {
  event_source_arn                   = aws_sqs_queue.ingest.arn
  function_name                      = module.worker.arn
  batch_size                         = 1
  maximum_batching_window_in_seconds = 0
  function_response_types            = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = var.max_concurrency
  }
}

data "aws_iam_policy_document" "scheduler_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  name               = "${var.name_prefix}-ingest-scheduler"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy" "scheduler" {
  name = "${var.name_prefix}-ingest-scheduler-invoke"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = [module.dispatch.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = [aws_sqs_queue.ingest_dlq.arn]
      },
    ]
  })
}

resource "aws_scheduler_schedule_group" "ingest" {
  name = "${var.name_prefix}-ingest"
  tags = var.tags
}

resource "aws_scheduler_schedule" "tier_a" {
  name       = "${var.name_prefix}-ingest-tier-a"
  group_name = aws_scheduler_schedule_group.ingest.name
  state      = var.schedules_enabled ? "ENABLED" : "DISABLED"

  schedule_expression = var.tier_a_schedule

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = module.dispatch.arn
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ tier = "A" })

    retry_policy {
      maximum_retry_attempts = 2
    }

    dead_letter_config {
      arn = aws_sqs_queue.ingest_dlq.arn
    }
  }
}

resource "aws_scheduler_schedule" "tier_bc" {
  for_each = toset(["B", "C"])

  name       = "${var.name_prefix}-ingest-tier-${lower(each.key)}"
  group_name = aws_scheduler_schedule_group.ingest.name
  state      = var.schedules_enabled ? "ENABLED" : "DISABLED"

  schedule_expression = var.tier_bc_schedule

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = module.dispatch.arn
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ tier = each.key })

    retry_policy {
      maximum_retry_attempts = 2
    }

    dead_letter_config {
      arn = aws_sqs_queue.ingest_dlq.arn
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "ingest_dlq_not_empty" {
  alarm_name          = "${var.name_prefix}-ingest-dlq-not-empty"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_description   = "A message reached the ingest dead letter queue, which always means a defect."
  tags                = var.tags

  dimensions = {
    QueueName = aws_sqs_queue.ingest_dlq.name
  }
}
