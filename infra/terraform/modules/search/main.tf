terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "random_password" "master" {
  length           = 32
  min_upper        = 1
  min_lower        = 1
  min_numeric      = 1
  min_special      = 1
  override_special = "!#$%^&*()-_=+"
}

resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/opensearch/${var.name_prefix}-search/application"
  retention_in_days = 14
  tags              = var.tags
}

data "aws_iam_policy_document" "logs" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["es.amazonaws.com"]
    }
    actions   = ["logs:PutLogEvents", "logs:CreateLogStream"]
    resources = ["${aws_cloudwatch_log_group.application.arn}:*"]
  }
}

resource "aws_cloudwatch_log_resource_policy" "logs" {
  policy_name     = "${var.name_prefix}-search-logs"
  policy_document = data.aws_iam_policy_document.logs.json
}

resource "aws_opensearch_domain" "this" {
  domain_name    = "${var.name_prefix}-search"
  engine_version = var.engine_version
  tags           = var.tags

  cluster_config {
    instance_type          = var.instance_type
    instance_count         = var.instance_count
    zone_awareness_enabled = var.instance_count > 1
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = var.volume_size_gb
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true

    master_user_options {
      master_user_name     = "admin"
      master_user_password = random_password.master.result
    }
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.application.arn
    log_type                 = "ES_APPLICATION_LOGS"
  }

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = "es:ESHttp*"
      Resource  = "arn:aws:es:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:domain/${var.name_prefix}-search/*"
    }]
  })

  depends_on = [aws_cloudwatch_log_resource_policy.logs]
}

resource "aws_ssm_parameter" "url" {
  name  = "${var.ssm_prefix}/OPENSEARCH_URL"
  type  = "String"
  value = "https://${aws_opensearch_domain.this.endpoint}"
  tags  = var.tags
}

resource "aws_ssm_parameter" "username" {
  name  = "${var.ssm_prefix}/OPENSEARCH_USERNAME"
  type  = "String"
  value = "admin"
  tags  = var.tags
}

resource "aws_ssm_parameter" "password" {
  name  = "${var.ssm_prefix}/OPENSEARCH_PASSWORD"
  type  = "SecureString"
  value = random_password.master.result
  tags  = var.tags
}
