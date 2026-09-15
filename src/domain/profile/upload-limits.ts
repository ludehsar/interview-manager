export const MAX_UPLOAD_BYTES = 10_000_000
export const UPLOAD_CONTENT_TYPE = 'application/pdf'

export type UploadStatus = 'PENDING' | 'EXTRACTING' | 'EXTRACTED' | 'ACCEPTED' | 'FAILED'

export function uploadKey(userId: string, uploadId: string): string {
  return `uploads/${userId}/${uploadId}.pdf`
}
