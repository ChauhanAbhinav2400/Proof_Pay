import { apiClient } from "./client";
import type { SignedDownloadUrlResult, UploadFileResult } from "../types/domain";

export interface UploadFileRequest {
  fileName: string;
  contentType: string;
  bodyBase64: string;
  metadata?: Record<string, string>;
  keyPrefix?: string;
}

export async function uploadFile(file: File, keyPrefix?: string): Promise<UploadFileResult> {
  const bodyBase64 = await fileToBase64(file);

  return apiClient
    .post<UploadFileResult>("/storage/upload", {
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      bodyBase64,
      keyPrefix
    } satisfies UploadFileRequest)
    .then(({ data }) => data);
}

export function getSignedDownloadUrl(key: string): Promise<SignedDownloadUrlResult> {
  return apiClient
    .get<SignedDownloadUrlResult>(`/storage/signed-url/${encodeURIComponent(key)}`)
    .then(({ data }) => data);
}

export function deleteFile(key: string): Promise<void> {
  return apiClient.delete<void>(`/storage/${encodeURIComponent(key)}`).then(() => undefined);
}

export function getDownloadUrl(key: string): string {
  return `/storage/download/${encodeURIComponent(key)}`;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return window.btoa(binary);
}
