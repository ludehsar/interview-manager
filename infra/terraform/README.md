# Infrastructure

State lives in S3 with Terraform's native lockfile (`use_lockfile = true`), so no
DynamoDB lock table is needed.

## First-time setup

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var state_bucket_name=interview-manager-tfstate-CHANGEME

cd ../envs/dev
cp terraform.tfvars.example terraform.tfvars   # then edit it
terraform init -backend-config="bucket=interview-manager-tfstate-CHANGEME" -backend-config="region=ap-southeast-1"
terraform apply
```

The three SSM parameters are created with the placeholder value `replace-me` and
`ignore_changes = [value]`, so Terraform never overwrites a real secret. Set them
once after the first apply:

```bash
aws ssm put-parameter --name /interview-manager-dev/DATABASE_URL --type SecureString --value '...' --overwrite
```
