#!/bin/bash
set -euo pipefail

REGION=ap-southeast-1
BUCKET=interview-manager-local
PREFIX=/interview-manager-local

awslocal s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" >/dev/null

awslocal s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}' >/dev/null

for queue in ingest embed; do
  awslocal sqs create-queue --queue-name "${queue}-dlq" --region "$REGION" >/dev/null
  DLQ_ARN=$(awslocal sqs get-queue-attributes \
    --queue-url "http://localhost:4566/000000000000/${queue}-dlq" \
    --attribute-names QueueArn --region "$REGION" \
    --query 'Attributes.QueueArn' --output text)
  awslocal sqs create-queue --queue-name "$queue" --region "$REGION" \
    --attributes "{\"VisibilityTimeout\":\"120\",\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" >/dev/null
done

awslocal ssm put-parameter --name "${PREFIX}/DATABASE_URL" --type SecureString \
  --value "postgresql://app:app@postgres:5432/interview_manager" --overwrite --region "$REGION" >/dev/null
awslocal ssm put-parameter --name "${PREFIX}/ANTHROPIC_API_KEY" --type SecureString \
  --value "local-placeholder" --overwrite --region "$REGION" >/dev/null
awslocal ssm put-parameter --name "${PREFIX}/CLERK_SECRET_KEY" --type SecureString \
  --value "local-placeholder" --overwrite --region "$REGION" >/dev/null

echo "localstack resources ready: s3://${BUCKET}, sqs ingest/embed (+dlq), ssm ${PREFIX}/*"
