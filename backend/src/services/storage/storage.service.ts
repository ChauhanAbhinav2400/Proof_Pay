import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type HeadObjectCommandOutput,
  type PutObjectCommandInput
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

import {
  DEFAULT_SIGNED_DOWNLOAD_URL_EXPIRY_SECONDS,
  MAX_FILE_SIZE,
  s3Client,
  storageConfig,
  SUPPORTED_CONTENT_TYPES
} from "../../config/storage";
import type {
  DeleteFileInput,
  DeleteFilesInput,
  DeleteFilesResult,
  FileExistsInput,
  FileMetadata,
  GenerateSignedDownloadUrlInput,
  GetFileMetadataInput,
  GetFileUrlInput,
  SignedDownloadUrlResult,
  UploadFileInput,
  UploadFileResult,
  UploadFilesInput
} from "./storage.types";

export async function uploadFile(
  input: UploadFileInput
): Promise<UploadFileResult> {
  const fileName = requireText(input.fileName, "Invalid file.");
  const contentType = requireText(input.contentType, "Invalid file.");
  const size = getBodySize(input.body);

  if (size === 0) {
    throw new Error("Invalid file.");
  }

  if (size > MAX_FILE_SIZE) {
    throw new Error("File exceeds maximum allowed size.");
  }

  if (!SUPPORTED_CONTENT_TYPES.includes(contentType)) {
    throw new Error("Unsupported file type.");
  }

  const key = buildObjectKey(fileName, input.keyPrefix);
  const putObjectInput: PutObjectCommandInput = {
    Bucket: storageConfig.bucket,
    Key: key,
    Body: input.body,
    ContentType: contentType
  };

  if (input.metadata !== undefined) {
    putObjectInput.Metadata = input.metadata;
  }

  try {
    const response = await s3Client.send(new PutObjectCommand(putObjectInput));
    const result: UploadFileResult = {
      key,
      bucket: storageConfig.bucket,
      url: getObjectUrl(key),
      contentType,
      size
    };

    if (response.ETag !== undefined) {
      result.etag = response.ETag;
    }

    return result;
  } catch (error) {
    throwStorageError("Upload failed.", error);
  }
}

export async function uploadFiles(
  input: UploadFilesInput
): Promise<UploadFileResult[]> {
  return Promise.all(input.files.map(uploadFile));
}

export async function deleteFile(input: DeleteFileInput): Promise<void> {
  const key = requireText(input.key, "Invalid file.");

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: storageConfig.bucket,
        Key: key
      })
    );
  } catch (error) {
    throwStorageError("Delete failed.", error);
  }
}

export async function deleteFiles(
  input: DeleteFilesInput
): Promise<DeleteFilesResult> {
  const keys = input.keys.map((key) => requireText(key, "Invalid file."));

  if (keys.length === 0) {
    return {
      deletedKeys: [],
      errors: []
    };
  }

  try {
    const response = await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: storageConfig.bucket,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
          Quiet: false
        }
      })
    );

    return {
      deletedKeys:
        response.Deleted?.map((deletedObject) => deletedObject.Key).filter(
          (key): key is string => typeof key === "string"
        ) ?? [],
      errors:
        response.Errors?.map((deleteError) => ({
          key: deleteError.Key ?? "",
          message: deleteError.Message ?? "Delete failed."
        })) ?? []
    };
  } catch (error) {
    throwStorageError("Delete failed.", error);
  }
}

export async function fileExists(input: FileExistsInput): Promise<boolean> {
  const key = requireText(input.key, "Invalid file.");

  try {
    await headObject(key);

    return true;
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }

    throwStorageError("Failed to fetch file metadata.", error);
  }
}

export function getFileUrl(input: GetFileUrlInput): string {
  const key = requireText(input.key, "Invalid file.");

  return getObjectUrl(key);
}

export async function generateSignedDownloadUrl(
  input: GenerateSignedDownloadUrlInput
): Promise<SignedDownloadUrlResult> {
  const key = requireText(input.key, "Invalid file.");
  const expiresInSeconds =
    input.expiresInSeconds ?? DEFAULT_SIGNED_DOWNLOAD_URL_EXPIRY_SECONDS;

  try {
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: storageConfig.bucket,
        Key: key
      }),
      { expiresIn: expiresInSeconds }
    );

    return {
      key,
      url,
      expiresInSeconds
    };
  } catch (error) {
    throwStorageError("Failed to generate signed URL.", error);
  }
}

export async function getFileMetadata(
  input: GetFileMetadataInput
): Promise<FileMetadata> {
  const key = requireText(input.key, "Invalid file.");

  try {
    const metadata = await headObject(key);

    return toFileMetadata(key, metadata);
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error("File not found.", { cause: error });
    }

    throwStorageError("Failed to fetch file metadata.", error);
  }
}

async function headObject(key: string): Promise<HeadObjectCommandOutput> {
  return s3Client.send(
    new HeadObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key
    })
  );
}

function toFileMetadata(
  key: string,
  metadata: HeadObjectCommandOutput
): FileMetadata {
  const fileMetadata: FileMetadata = {
    key,
    bucket: storageConfig.bucket,
    url: getObjectUrl(key),
    metadata: metadata.Metadata ?? {}
  };

  if (metadata.ContentType !== undefined) {
    fileMetadata.contentType = metadata.ContentType;
  }

  if (metadata.ContentLength !== undefined) {
    fileMetadata.contentLength = metadata.ContentLength;
  }

  if (metadata.ETag !== undefined) {
    fileMetadata.etag = metadata.ETag;
  }

  if (metadata.LastModified !== undefined) {
    fileMetadata.lastModified = metadata.LastModified;
  }

  return fileMetadata;
}

function buildObjectKey(fileName: string, keyPrefix?: string): string {
  const safeFileName = sanitizeFileName(fileName);
  const normalizedPrefix = normalizeKeyPrefix(keyPrefix);

  return `${normalizedPrefix}${randomUUID()}-${safeFileName}`;
}

function normalizeKeyPrefix(keyPrefix?: string): string {
  if (!keyPrefix) {
    return "";
  }

  const prefix = keyPrefix
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  return prefix ? `${prefix}/` : "";
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getObjectUrl(key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  return `https://${storageConfig.bucket}.s3.${storageConfig.region}.amazonaws.com/${encodedKey}`;
}

function getBodySize(body: UploadFileInput["body"]): number {
  return body.byteLength;
}

function requireText(value: string, message: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
}

function throwStorageError(message: string, error: unknown): never {
  if (isNotFoundError(error)) {
    throw new Error("File not found.", { cause: error });
  }

  throw new Error(message, { cause: error });
}

function isNotFoundError(error: unknown): boolean {
  const statusCode = getHttpStatusCode(error);
  const name = getErrorName(error);

  return (
    statusCode === 404 ||
    name === "NotFound" ||
    name === "NoSuchKey" ||
    name === "NotFoundException"
  );
}

function getHttpStatusCode(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const metadata = error.$metadata;

  if (!isRecord(metadata)) {
    return undefined;
  }

  return typeof metadata.httpStatusCode === "number"
    ? metadata.httpStatusCode
    : undefined;
}

function getErrorName(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.name;
  }

  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.name === "string" ? error.name : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
