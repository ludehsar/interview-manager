variable "name_prefix" {
  type = string
}

variable "dist_dir" {
  type = string
}

variable "lambda_dist_dir" {
  type = string
}

variable "ssm_prefix" {
  type = string
}

variable "bucket" {
  type = string
}

variable "bucket_arn" {
  type = string
}

variable "lambda_environment" {
  type    = map(string)
  default = {}
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "target_score" {
  type    = number
  default = 85
}

variable "max_revisions" {
  type    = number
  default = 2
}

variable "reasoning_timeout_s" {
  type    = number
  default = 600
}

variable "step_timeout_s" {
  type    = number
  default = 120
}

variable "tags" {
  type    = map(string)
  default = {}
}
