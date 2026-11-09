#!/bin/bash

# ==============================================================================
# MongoDB Backup & Cloudflare R2 Sync Script for Malamal
# ==============================================================================
# - Takes compressed MongoDB archive using mongodump
# - Uploads to Cloudflare R2 under isolated folder: 'db-backups/'
# - Preserves other files (images, media) in the 'malamal' bucket
# - Keeps ONLY the latest 2 backups in Cloudflare R2 (auto-rotates older ones)
# - Keeps ONLY the latest 2 backups locally on the Linux server
# ==============================================================================

# Script Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Possible .env locations
ENV_FILE="${ENV_PATH:-${PROJECT_ROOT}/.env}"

# 1. Load configurations directly from backend_apis/.env
if [ -f "$ENV_FILE" ]; then
    echo "✅ Found .env file at: $ENV_FILE"
    # Safely evaluate only DB_URL and CLOUDFLARE_R2_* variables from .env
    eval $(grep -E '^\s*(DB_URL|CLOUDFLARE_R2_[A-Z_]+)\s*=' "$ENV_FILE" | sed -E 's/^\s*//')
else
    echo "⚠️ WARNING: .env file not found at: $ENV_FILE"
fi

# Use loaded environment variables from backend_apis/.env
MONGO_URI="${DB_URL}"
R2_BUCKET="${CLOUDFLARE_R2_BUCKET_NAME}"
R2_ENDPOINT="${CLOUDFLARE_R2_ENDPOINT}"
export AWS_ACCESS_KEY_ID="${CLOUDFLARE_R2_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${CLOUDFLARE_R2_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="auto"

# Validate required variables
if [ -z "$MONGO_URI" ] || [ -z "$R2_BUCKET" ] || [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ ERROR: Missing required environment variables!"
    echo "Ensure DB_URL, CLOUDFLARE_R2_BUCKET_NAME, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY exist in $ENV_FILE"
    exit 1
fi

# CRITICAL SAFETY: Isolating database backups in a dedicated sub-folder
# All media files (product images, assets) in 'malamal' bucket remain completely untouched!
R2_FOLDER="db-backups"
BACKUP_PREFIX="mongo_backup_"

# Local Backup Directory
BACKUP_DIR="/var/backups/mongodb"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILENAME="${BACKUP_PREFIX}${TIMESTAMP}.archive.gz"
BACKUP_FILE_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

echo "=================================================="
echo " Starting MongoDB Backup at $(date)"
echo " Bucket: ${R2_BUCKET}"
echo " Destination: ${R2_FOLDER}/${BACKUP_FILENAME}"
echo "=================================================="

# Step 1: Create mongodump archive
echo "[1/4] Running mongodump..."
mongodump --uri="$MONGO_URI" --archive="$BACKUP_FILE_PATH" --gzip

if [ $? -ne 0 ]; then
    echo "❌ ERROR: mongodump failed! Check your connection string or mongodump installation."
    exit 1
fi
echo "✅ Local backup created: $BACKUP_FILE_PATH"

# Step 2: Upload to Cloudflare R2
echo "[2/4] Uploading to Cloudflare R2 (${R2_FOLDER}/)..."
aws s3 cp "$BACKUP_FILE_PATH" "s3://${R2_BUCKET}/${R2_FOLDER}/${BACKUP_FILENAME}" --endpoint-url "$R2_ENDPOINT"

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Upload to Cloudflare R2 failed! Check network or credentials."
    exit 1
fi
echo "✅ Uploaded successfully to Cloudflare R2."

# Step 3: Cloudflare R2 Retention - Keep ONLY the latest 2 backups
# SAFETY GUARANTEE: Only lists and deletes objects matching '${R2_FOLDER}/${BACKUP_PREFIX}'
echo "[3/4] Checking and pruning older backups in Cloudflare R2 (keeping latest 2)..."
aws s3api list-objects-v2 \
  --bucket "$R2_BUCKET" \
  --prefix "${R2_FOLDER}/${BACKUP_PREFIX}" \
  --endpoint-url "$R2_ENDPOINT" \
  --query 'reverse(sort_by(Contents, &LastModified))[2:].Key' \
  --output text | tr '\t' '\n' | while read -r key; do
    if [[ -n "$key" && "$key" != "None" && "$key" == "${R2_FOLDER}/${BACKUP_PREFIX}"* ]]; then
      echo "🗑️ Deleting old cloud backup: $key"
      aws s3 rm "s3://${R2_BUCKET}/${key}" --endpoint-url "$R2_ENDPOINT"
    fi
done
echo "✅ Cloudflare R2 rotation complete."

# Step 4: Local Server Retention - Keep ONLY the latest 2 backups locally
echo "[4/4] Pruning old local backups on Linux server (keeping latest 2)..."
cd "$BACKUP_DIR" && ls -tp "${BACKUP_PREFIX}"* 2>/dev/null | grep -v '/$' | tail -n +3 | while read -r old_file; do
  if [ -n "$old_file" ]; then
    echo "🗑️ Deleting old local backup: $old_file"
    rm -f "$old_file"
  fi
done
echo "✅ Local storage cleanup complete."

echo "=================================================="
echo "🎉 Backup and Sync Completed Successfully at $(date)"
echo "=================================================="

