data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
  tags            = local.tags
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "${local.name}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "github_deploy" {
  role       = aws_iam_role.github_deploy.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

resource "aws_iam_role_policy" "github_deploy_iam" {
  name = "${local.name}-github-iam"
  role = aws_iam_role.github_deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PassRole",
        "iam:TagRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRolePolicy",
        "iam:ListRolePolicies",
        "iam:ListAttachedRolePolicies"
      ]
      Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project}-*"
    }]
  })
}

data "aws_iam_policy_document" "vercel_assume" {
  count = var.vercel_team_slug == "" ? 0 : 1

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.vercel[0].arn]
    }
    condition {
      test     = "StringEquals"
      variable = "oidc.vercel.com/${var.vercel_team_slug}:aud"
      values   = ["https://vercel.com/${var.vercel_team_slug}"]
    }
    condition {
      test     = "StringLike"
      variable = "oidc.vercel.com/${var.vercel_team_slug}:sub"
      values   = ["owner:${var.vercel_team_slug}:project:${var.vercel_project_name}:environment:*"]
    }
  }
}

resource "aws_iam_openid_connect_provider" "vercel" {
  count           = var.vercel_team_slug == "" ? 0 : 1
  url             = "https://oidc.vercel.com/${var.vercel_team_slug}"
  client_id_list  = ["https://vercel.com/${var.vercel_team_slug}"]
  thumbprint_list = ["9e99a48a9960b14926bb7f3b02e22da2b0ab7280"]
  tags            = local.tags
}

resource "aws_iam_role" "vercel_runtime" {
  count              = var.vercel_team_slug == "" ? 0 : 1
  name               = "${local.name}-vercel-runtime"
  assume_role_policy = data.aws_iam_policy_document.vercel_assume[0].json
  tags               = local.tags
}

resource "aws_iam_role_policy" "vercel_runtime" {
  count = var.vercel_team_slug == "" ? 0 : 1
  name  = "${local.name}-vercel-runtime"
  role  = aws_iam_role.vercel_runtime[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "${module.storage.arn}/*"
      }
    ]
  })
}
