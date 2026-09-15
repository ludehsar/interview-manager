variable "name_prefix" {
  type = string
}

variable "ssm_prefix" {
  type = string
}

variable "engine_version" {
  type    = string
  default = "OpenSearch_2.19"
}

variable "instance_type" {
  type        = string
  description = "t3.small.search is the cheapest type that supports fine-grained access control"
  default     = "t3.small.search"
}

variable "instance_count" {
  type    = number
  default = 1
}

variable "volume_size_gb" {
  type    = number
  default = 10
}

variable "index_name" {
  type    = string
  default = "jobs"
}

variable "tags" {
  type    = map(string)
  default = {}
}
