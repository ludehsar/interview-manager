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

variable "app_url" {
  type    = string
  default = "http://localhost:3000"
}

variable "opensearch_enabled" {
  type        = bool
  description = "A managed OpenSearch domain is a standing hourly cost; jobs search falls back to postgres when this is false"
  default     = false
}

variable "opensearch_instance_type" {
  type    = string
  default = "t3.small.search"
}

variable "opensearch_volume_size_gb" {
  type    = number
  default = 10
}

variable "schedules_enabled" {
  type        = bool
  description = "Ingest schedulers fire only once DATABASE_URL in SSM is a real connection string"
  default     = false
}

variable "ingest_max_pages" {
  type    = number
  default = 5
}

variable "location_llm_fallback" {
  type    = bool
  default = false
}
