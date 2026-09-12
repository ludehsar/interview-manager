import {
  DeleteMessageBatchCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  type Message,
} from '@aws-sdk/client-sqs'
import { sqsClient } from './clients'

const BATCH_SIZE = 10

export async function sendBatch(queueUrl: string, bodies: string[]): Promise<number> {
  let sent = 0
  for (let index = 0; index < bodies.length; index += BATCH_SIZE) {
    const chunk = bodies.slice(index, index + BATCH_SIZE)
    const response = await sqsClient().send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: chunk.map((body, offset) => ({ Id: String(index + offset), MessageBody: body })),
      }),
    )
    sent += response.Successful?.length ?? 0
  }
  return sent
}

export async function receive(queueUrl: string, waitSeconds = 2, max = BATCH_SIZE): Promise<Message[]> {
  const response = await sqsClient().send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: Math.min(max, BATCH_SIZE),
      WaitTimeSeconds: waitSeconds,
    }),
  )
  return response.Messages ?? []
}

export async function deleteBatch(queueUrl: string, receipts: { id: string; receiptHandle: string }[]): Promise<void> {
  if (receipts.length === 0) return
  for (let index = 0; index < receipts.length; index += BATCH_SIZE) {
    const chunk = receipts.slice(index, index + BATCH_SIZE)
    await sqsClient().send(
      new DeleteMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: chunk.map((entry) => ({ Id: entry.id, ReceiptHandle: entry.receiptHandle })),
      }),
    )
  }
}

export async function queueDepth(queueUrl: string): Promise<number> {
  const response = await sqsClient().send(
    new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ['ApproximateNumberOfMessages'] }),
  )
  return Number(response.Attributes?.ApproximateNumberOfMessages ?? 0)
}
