import { S3Client } from "@aws-sdk/client-s3";

import { env } from "./env";

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

export const storageConfig = Object.freeze({
  region: env.AWS_REGION,
  bucket: env.AWS_S3_BUCKET_NAME
});

export const s3Client = new S3Client({
  region: storageConfig.region,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  }
});
