import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client } from './clients'

const DELETE_BATCH_SIZE = 1000

export function bucket(): string {
  const name = process.env.S3_BUCKET
  if (!name) throw new Error('S3_BUCKET is not set')
  return name
}

export async function presignPut(
  key: string,
  contentType: string,
  options: { expiresIn?: number; contentLength?: number } = {},
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
    ...(options.contentLength ? { ContentLength: options.contentLength } : {}),
  })
  return getSignedUrl(s3Client(), command, { expiresIn: options.expiresIn ?? 300 })
}

export async function presignGet(key: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(s3Client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn })
}

export async function putObject(key: string, body: Uint8Array | string, contentType: string): Promise<void> {
  await s3Client().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }))
}

export async function putJson(key: string, value: unknown): Promise<void> {
  await putObject(key, JSON.stringify(value), 'application/json')
}

export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const response = await s3Client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }))
  if (!response.Body) throw new Error(`s3 object ${key} has no body`)
  return response.Body.transformToByteArray()
}

export async function getObjectText(key: string): Promise<string> {
  const response = await s3Client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }))
  if (!response.Body) throw new Error(`s3 object ${key} has no body`)
  return response.Body.transformToString()
}

export async function getObjectJson<T>(key: string): Promise<T> {
  return JSON.parse(await getObjectText(key)) as T
}

export async function headObject(key: string): Promise<{ bytes: number; contentType: string | null } | null> {
  try {
    const response = await s3Client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }))
    return { bytes: response.ContentLength ?? 0, contentType: response.ContentType ?? null }
  } catch (error) {
    if (error instanceof Error && (error.name === 'NotFound' || error.name === 'NoSuchKey')) return null
    throw error
  }
}

export async function deletePrefix(prefix: string): Promise<number> {
  let deleted = 0
  let token: string | undefined

  do {
    const listed = await s3Client().send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }),
    )
    const keys = (listed.Contents ?? []).map((entry) => entry.Key).filter((key): key is string => Boolean(key))

    for (let index = 0; index < keys.length; index += DELETE_BATCH_SIZE) {
      const chunk = keys.slice(index, index + DELETE_BATCH_SIZE)
      await s3Client().send(
        new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: chunk.map((Key) => ({ Key })) } }),
      )
      deleted += chunk.length
    }

    token = listed.IsTruncated ? listed.NextContinuationToken : undefined
  } while (token)

  return deleted
}
