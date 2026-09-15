import { DescribeExecutionCommand, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { sfnClient } from './clients'

export type ExecutionStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED' | 'PENDING_REDRIVE'

export async function startExecution(stateMachineArn: string, name: string, input: unknown): Promise<string> {
  const response = await sfnClient().send(
    new StartExecutionCommand({
      stateMachineArn,
      name: name.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 80),
      input: JSON.stringify(input),
    }),
  )
  if (!response.executionArn) throw new Error('step functions returned no execution arn')
  return response.executionArn
}

export async function describeExecution(
  executionArn: string,
): Promise<{ status: ExecutionStatus; error: string | null; output: string | null }> {
  const response = await sfnClient().send(new DescribeExecutionCommand({ executionArn }))
  return {
    status: (response.status ?? 'RUNNING') as ExecutionStatus,
    error: response.error ?? null,
    output: response.output ?? null,
  }
}
