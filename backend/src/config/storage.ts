import "dotenv/config";

import { S3Client } from "@aws-sdk/client-s3";

const MEBIBYTE = 1024 * 1024;

// A 25 MiB cap accommodates typical evidence and contract documents while limiting abuse.
export const MAX_FILE_SIZE = 25 * MEBIBYTE;

// ProofPay accepts common document and evidence formats through its single storage bucket.
export const SUPPORTED_CONTENT_TYPES: readonly string[] = Object.freeze([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg"
] as const);

export const DEFAULT_SIGNED_DOWNLOAD_URL_EXPIRY_SECONDS = 900;

const accessKeyId = getRequiredEnv("AWS_ACCESS_KEY_ID");
const secretAccessKey = getRequiredEnv("AWS_SECRET_ACCESS_KEY");

export const storageConfig = Object.freeze({
  region: getRequiredEnv("AWS_REGION"),
  bucket: getRequiredEnv("AWS_S3_BUCKET_NAME")
});

export const s3Client = new S3Client({
  region: storageConfig.region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

function getRequiredEnv(name: StorageEnvironmentVariable): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value.trim();
}

type StorageEnvironmentVariable =
  | "AWS_ACCESS_KEY_ID"
  | "AWS_SECRET_ACCESS_KEY"
  | "AWS_REGION"
  | "AWS_S3_BUCKET_NAME";
