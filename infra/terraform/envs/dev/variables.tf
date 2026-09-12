variable "region" {
  type    = string
  default = "ap-southeast-1"
}

variable "env" {
  type    = string
  default = "dev"
}

variable "project" {
  type    = string
  default = "interview-manager"
}

variable "bucket_name" {
  type = string
}

variable "budget_limit_usd" {
  type    = string
  default = "5"
}

variable "budget_alert_email" {
  type = string
}

variable "github_repo" {
  type        = string
  description = "owner/repo allowed to assume the deploy role"
}

variable "vercel_team_slug" {
  type        = string
  description = "Vercel team or account slug used as the OIDC audience"
  default     = ""
}

variable "vercel_project_name" {
  type    = string
  default = "interview-manager"
}
