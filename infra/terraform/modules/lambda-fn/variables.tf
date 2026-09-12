variable "name" {
  type = string
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "runtime" {
  type    = string
  default = "nodejs22.x"
}

variable "architecture" {
  type    = string
  default = "arm64"
}

variable "package_path" {
  type = string
}

variable "memory_mb" {
  type    = number
  default = 512
}

variable "timeout_s" {
  type    = number
  default = 60
}

variable "environment" {
  type    = map(string)
  default = {}
}

variable "policy_statements" {
  type = list(object({
    actions   = list(string)
    resources = list(string)
  }))
  default = []
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "tags" {
  type    = map(string)
  default = {}
}
