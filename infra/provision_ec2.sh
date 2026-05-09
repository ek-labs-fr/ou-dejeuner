#!/usr/bin/env bash
#
# Provision the EC2 instance + Elastic IP via AWS CLI.
# Skips work already done by hand (security group, key pair).
#
# Prereqs:
#   - aws cli installed and configured (`aws sts get-caller-identity` should
#     return a sensible identity in the AWS account you want to deploy to)
#   - the key pair `oudejeuner-staging` and the SG `oudejeuner-staging-sg`
#     already exist in the target region
#
# Override defaults via env vars: REGION, KEY_NAME, SG_NAME, INSTANCE_NAME,
# AWS_PROFILE.
#
# Not idempotent — running it twice creates two instances and two EIPs.

set -euo pipefail

# Stop Git Bash from rewriting Unix-style paths (e.g. `/dev/xvda`) into
# Windows paths when forwarding them to native exes like aws.exe.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

REGION="${REGION:-eu-west-3}"
KEY_NAME="${KEY_NAME:-oudejeuner-staging}"
SG_NAME="${SG_NAME:-oudejeuner-staging-sg}"
INSTANCE_NAME="${INSTANCE_NAME:-oudejeuner-staging}"

echo "==> Region: $REGION"
echo "==> Verifying AWS credentials"
aws sts get-caller-identity --output text --query 'Arn'

echo "==> Resolving security group: $SG_NAME"
SG_ID=$(aws ec2 describe-security-groups \
  --region "$REGION" \
  --filters "Name=group-name,Values=$SG_NAME" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)
if [[ "$SG_ID" == "None" || -z "$SG_ID" ]]; then
  echo "Security group '$SG_NAME' not found in $REGION." >&2
  exit 1
fi
echo "    $SG_ID"

echo "==> Looking up latest Amazon Linux 2023 x86_64 AMI (free-tier-eligible)"
AMI_ID=$(aws ec2 describe-images \
  --region "$REGION" \
  --owners amazon \
  --filters \
    "Name=name,Values=al2023-ami-*-x86_64" \
    "Name=state,Values=available" \
    "Name=architecture,Values=x86_64" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)
echo "    $AMI_ID"

echo "==> Launching t3.micro (8 GiB gp3, AL2023 x86_64, 1 GiB RAM, free tier)"
INSTANCE_ID=$(aws ec2 run-instances \
  --region "$REGION" \
  --image-id "$AMI_ID" \
  --instance-type t3.micro \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=8,VolumeType=gp3}' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
  --query 'Instances[0].InstanceId' \
  --output text)
echo "    $INSTANCE_ID"

echo "==> Waiting for instance to reach 'running' (may take ~30s)"
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"

echo "==> Allocating Elastic IP"
ALLOC_ID=$(aws ec2 allocate-address \
  --region "$REGION" \
  --query 'AllocationId' \
  --output text)

aws ec2 associate-address \
  --region "$REGION" \
  --allocation-id "$ALLOC_ID" \
  --instance-id "$INSTANCE_ID" >/dev/null

EIP=$(aws ec2 describe-addresses \
  --region "$REGION" \
  --allocation-ids "$ALLOC_ID" \
  --query 'Addresses[0].PublicIp' \
  --output text)

echo
echo "==> Done."
echo "    Instance ID:    $INSTANCE_ID"
echo "    Elastic IP:     $EIP"
echo "    Allocation ID:  $ALLOC_ID"
echo
echo "    Try it: ssh -i ~/.ssh/$KEY_NAME.pem ec2-user@$EIP"
