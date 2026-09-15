output "state_machine_arn" {
  value = aws_sfn_state_machine.resume.arn
}

output "render_function_arn" {
  value = module.typst_render.arn
}

output "step_function_arns" {
  value = local.step_arns
}
