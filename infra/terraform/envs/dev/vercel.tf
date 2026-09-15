data "aws_iam_policy_document" "vercel_runtime" {
  statement {
    sid       = "Artifacts"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${module.storage.arn}/*"]
  }

  statement {
    sid       = "ArtifactsList"
    actions   = ["s3:ListBucket"]
    resources = [module.storage.arn]
  }

  statement {
    sid       = "StartResumeBuild"
    actions   = ["states:StartExecution"]
    resources = [module.resume_pipeline.state_machine_arn]
  }

  statement {
    sid     = "ReadResumeBuild"
    actions = ["states:DescribeExecution", "states:StopExecution"]
    resources = [
      "arn:aws:states:${var.region}:${data.aws_caller_identity.current.account_id}:execution:${local.name}-resume-pipeline:*"
    ]
  }

  statement {
    sid       = "EmbedQueries"
    actions   = ["lambda:InvokeFunction"]
    resources = [module.ingest.embed_function_arn]
  }
}

resource "aws_iam_user" "vercel_runtime" {
  name = "${local.name}-vercel-runtime"
  tags = local.tags
}

resource "aws_iam_user_policy" "vercel_runtime" {
  name   = "${local.name}-vercel-runtime"
  user   = aws_iam_user.vercel_runtime.name
  policy = data.aws_iam_policy_document.vercel_runtime.json
}
