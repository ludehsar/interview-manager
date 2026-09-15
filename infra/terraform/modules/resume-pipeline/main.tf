data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  ssm_arn_prefix = "arn:aws:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_prefix}"

  ssm_read_statement = {
    actions   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath", "kms:Decrypt"]
    resources = ["${local.ssm_arn_prefix}/*", "${local.ssm_arn_prefix}*"]
  }

  artifact_read_statement = {
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${var.bucket_arn}/*"]
  }

  shared_environment = merge(var.lambda_environment, {
    S3_BUCKET            = var.bucket
    RESUME_TARGET_SCORE  = tostring(var.target_score)
    RESUME_MAX_REVISIONS = tostring(var.max_revisions)
    EMBEDDING_PROVIDER   = "lambda"
  })

  reasoning_steps = {
    draft  = { memory = 1024 }
    screen = { memory = 1024 }
    revise = { memory = 1024 }
  }

  plain_steps = {
    extract   = { memory = 1024 }
    kg-build  = { memory = 1024 }
    guard     = { memory = 512 }
    ats-score = { memory = 1024 }
    persist   = { memory = 512 }
  }
}

module "reasoning_step" {
  for_each = local.reasoning_steps
  source   = "../lambda-fn"

  name               = "${var.name_prefix}-resume-${each.key}"
  source_dir         = "${var.dist_dir}/resume-${each.key}"
  memory_mb          = each.value.memory
  timeout_s          = var.reasoning_timeout_s
  log_retention_days = var.log_retention_days
  environment        = local.shared_environment
  tags               = var.tags

  policy_statements = [local.ssm_read_statement, local.artifact_read_statement]
}

module "plain_step" {
  for_each = local.plain_steps
  source   = "../lambda-fn"

  name               = "${var.name_prefix}-resume-${each.key}"
  source_dir         = "${var.dist_dir}/resume-${each.key}"
  memory_mb          = each.value.memory
  timeout_s          = var.step_timeout_s
  log_retention_days = var.log_retention_days
  environment        = local.shared_environment
  tags               = var.tags

  policy_statements = [local.ssm_read_statement, local.artifact_read_statement]
}

module "typst_render" {
  source = "../lambda-fn"

  name               = "${var.name_prefix}-typst-render"
  source_dir         = "${var.lambda_dist_dir}/typst-render"
  runtime            = "provided.al2023"
  handler            = "bootstrap"
  memory_mb          = 1024
  timeout_s          = var.step_timeout_s
  log_retention_days = var.log_retention_days
  environment        = { S3_BUCKET = var.bucket }
  tags               = var.tags

  policy_statements = [
    {
      actions   = ["s3:PutObject"]
      resources = ["${var.bucket_arn}/pdf/*", "${var.bucket_arn}/typst/*"]
    },
  ]
}

module "render_step" {
  source = "../lambda-fn"

  name               = "${var.name_prefix}-resume-render"
  source_dir         = "${var.dist_dir}/resume-render"
  memory_mb          = 512
  timeout_s          = var.step_timeout_s
  log_retention_days = var.log_retention_days
  environment        = merge(local.shared_environment, { RENDER_FUNCTION_ARN = module.typst_render.arn })
  tags               = var.tags

  policy_statements = [
    local.ssm_read_statement,
    local.artifact_read_statement,
    {
      actions   = ["lambda:InvokeFunction"]
      resources = [module.typst_render.arn]
    },
  ]
}

locals {
  step_arns = merge(
    { for key, mod in module.reasoning_step : key => mod.arn },
    { for key, mod in module.plain_step : key => mod.arn },
    {
      render       = module.render_step.arn
      typst-render = module.typst_render.arn
    },
  )
}

data "aws_iam_policy_document" "states_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["states.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "states" {
  name               = "${var.name_prefix}-resume-pipeline"
  assume_role_policy = data.aws_iam_policy_document.states_assume.json
  tags               = var.tags
}

data "aws_iam_policy_document" "states" {
  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = [for key, arn in local.step_arns : arn if key != "typst-render"]
  }

  statement {
    actions = [
      "logs:CreateLogDelivery",
      "logs:GetLogDelivery",
      "logs:UpdateLogDelivery",
      "logs:DeleteLogDelivery",
      "logs:ListLogDeliveries",
      "logs:PutResourcePolicy",
      "logs:DescribeResourcePolicies",
      "logs:DescribeLogGroups",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "states" {
  role   = aws_iam_role.states.id
  policy = data.aws_iam_policy_document.states.json
}

resource "aws_cloudwatch_log_group" "states" {
  name              = "/aws/vendedlogs/states/${var.name_prefix}-resume-pipeline"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_sfn_state_machine" "resume" {
  name     = "${var.name_prefix}-resume-pipeline"
  role_arn = aws_iam_role.states.arn
  type     = "STANDARD"
  tags     = var.tags

  definition = templatefile("${path.module}/templates/resume-pipeline.asl.json", {
    extract_arn   = local.step_arns["extract"]
    kg_build_arn  = local.step_arns["kg-build"]
    draft_arn     = local.step_arns["draft"]
    guard_arn     = local.step_arns["guard"]
    screen_arn    = local.step_arns["screen"]
    revise_arn    = local.step_arns["revise"]
    render_arn    = local.step_arns["render"]
    ats_score_arn = local.step_arns["ats-score"]
    persist_arn   = local.step_arns["persist"]
    target_score  = var.target_score
    max_revisions = var.max_revisions
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.states.arn}:*"
    include_execution_data = false
    level                  = "ERROR"
  }
}
