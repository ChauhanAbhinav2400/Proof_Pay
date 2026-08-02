export type FileBody = Buffer | Uint8Array;

export interface UploadFileInput {
  fileName: string;
  contentType: string;
  body: FileBody;
  metadata?: Record<string, string>;
  keyPrefix?: string;
}

export interface UploadFileResult {
  key: string;
  bucket: string;
  url: string;
  contentType: string;
  size: number;
  etag?: string;
}

export interface UploadFilesInput {
  files: UploadFileInput[];
}

export interface DeleteFileInput {
  key: string;
}

export interface DeleteFilesInput {
  keys: string[];
}

export interface DeleteFilesResult {
  deletedKeys: string[];
  errors: DeleteFileError[];
}

export interface DeleteFileError {
  key: string;
  message: string;
}

export interface FileExistsInput {
  key: string;
}

export interface GetFileUrlInput {
  key: string;
}

export interface GenerateSignedDownloadUrlInput {
  key: string;
  expiresInSeconds?: number;
}

export interface SignedDownloadUrlResult {
  key: string;
  url: string;
  expiresInSeconds: number;
}

export interface GetFileMetadataInput {
  key: string;
}

export interface FileMetadata {
  key: string;
  bucket: string;
  url: string;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
  metadata: Record<string, string>;
}
