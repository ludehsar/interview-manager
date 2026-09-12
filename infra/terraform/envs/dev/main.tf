locals {
  name = "${var.project}-${var.env}"
  tags = {
    Project = var.project
    Env     = var.env
    Managed = "terraform"
  }
}

data "aws_caller_identity" "current" {}

module "storage" {
  source      = "../../modules/storage"
  bucket_name = var.bucket_name
  tags        = local.tags
}

resource "aws_ssm_parameter" "database_url" {
  name  = "/${local.name}/DATABASE_URL"
  type  = "SecureString"
  value = "replace-me"
  tags  = local.tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "anthropic_api_key" {
  name  = "/${local.name}/ANTHROPIC_API_KEY"
  type  = "SecureString"
  value = "replace-me"
  tags  = local.tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "clerk_secret_key" {
  name  = "/${local.name}/CLERK_SECRET_KEY"
  type  = "SecureString"
  value = "replace-me"
  tags  = local.tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_budgets_budget" "monthly" {
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = var.budget_limit_usd
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}

module "ingest" {
  source = "../../modules/ingest"

  name_prefix = local.name
  dist_dir    = "${path.root}/../../../dist/workers"
  ssm_prefix  = "/${local.name}"
  tags        = local.tags

  lambda_environment = {
    APP_URL               = var.app_url
    S3_BUCKET             = module.storage.bucket
    INGEST_MAX_PAGES      = tostring(var.ingest_max_pages)
    LOCATION_LLM_FALLBACK = tostring(var.location_llm_fallback)
    SSM_PREFIX            = "/${local.name}"
  }
}
