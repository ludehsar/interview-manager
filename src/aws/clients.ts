import { S3Client } from '@aws-sdk/client-s3'
import { SQSClient } from '@aws-sdk/client-sqs'
import { SFNClient } from '@aws-sdk/client-sfn'
import { SSMClient } from '@aws-sdk/client-ssm'
import { LambdaClient } from '@aws-sdk/client-lambda'

const LOCAL_CREDENTIALS = { accessKeyId: 'test', secretAccessKey: 'test' }

function region() {
  return process.env.AWS_REGION ?? 'ap-southeast-1'
}

function endpoint() {
  return process.env.AWS_ENDPOINT_URL || undefined
}

function baseConfig() {
  const url = endpoint()
  if (!url) return { region: region() }
  return { region: region(), endpoint: url, credentials: LOCAL_CREDENTIALS }
}

let s3: S3Client | null = null
let sqs: SQSClient | null = null
let sfn: SFNClient | null = null
let ssm: SSMClient | null = null
let lambda: LambdaClient | null = null

export function s3Client() {
  if (!s3) s3 = new S3Client({ ...baseConfig(), ...(endpoint() ? { forcePathStyle: true } : {}) })
  return s3
}

export function sqsClient() {
  if (!sqs) sqs = new SQSClient(baseConfig())
  return sqs
}

export function sfnClient() {
  if (!sfn) sfn = new SFNClient(baseConfig())
  return sfn
}

export function ssmClient() {
  if (!ssm) ssm = new SSMClient(baseConfig())
  return ssm
}

export function lambdaClient() {
  if (!lambda) lambda = new LambdaClient(baseConfig())
  return lambda
}

export function isLocalAws() {
  return Boolean(endpoint())
}
