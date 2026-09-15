import { InvokeCommand } from '@aws-sdk/client-lambda'
import { lambdaClient } from './clients'

export async function invokeJson<T>(functionArn: string, payload: unknown): Promise<T> {
  const response = await lambdaClient().send(
    new InvokeCommand({
      FunctionName: functionArn,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  )

  const body = response.Payload ? Buffer.from(response.Payload).toString('utf8') : ''
  if (response.FunctionError) throw new Error(`lambda ${functionArn} failed: ${body.slice(0, 500)}`)
  if (!body) throw new Error(`lambda ${functionArn} returned an empty payload`)

  return JSON.parse(body) as T
}
