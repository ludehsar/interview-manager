variable "name_prefix" {
  type = string
}

variable "dist_dir" {
  type = string
}

variable "ssm_prefix" {
  type = string
}

variable "lambda_environment" {
  type    = map(string)
  default = {}
}

variable "tier_a_schedule" {
  type    = string
  default = "rate(1 hour)"
}

variable "tier_bc_schedule" {
  type    = string
  default = "rate(6 hours)"
}

variable "worker_timeout_s" {
  type    = number
  default = 300
}

variable "worker_memory_mb" {
  type    = number
  default = 1024
}

variable "max_concurrency" {
  type    = number
  default = 5
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "schedules_enabled" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
