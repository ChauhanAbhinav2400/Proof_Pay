import type { Request, Response } from "express";

import { storageService } from "../services/storage";
import type { UploadFileInput } from "../services/storage";
import { asyncHandler } from "../utils/asyncHandler";

interface UploadRequestBody {
  fileName?: unknown;
  contentType?: unknown;
  bodyBase64?: unknown;
  metadata?: unknown;
  keyPrefix?: unknown;
}

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UploadRequestBody;
  const uploadInput: UploadFileInput = {
    fileName: requireString(body.fileName, "File name is required."),
    contentType: requireString(body.contentType, "Content type is required."),
    body: Buffer.from(requireString(body.bodyBase64, "File body is required."), "base64")
  };

  if (isRecord(body.metadata)) {
    uploadInput.metadata = toStringRecord(body.metadata);
  }

  if (typeof body.keyPrefix === "string") {
    uploadInput.keyPrefix = body.keyPrefix;
  }

  const result = await storageService.uploadFile(uploadInput);

  res.status(201).json(result);
});

export const downloadFile = asyncHandler(async (req: Request, res: Response) => {
  const result = await storageService.generateSignedDownloadUrl({
    key: getStorageKey(req)
  });

  res.redirect(result.url);
});

export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  await storageService.deleteFile({ key: getStorageKey(req) });

  res.status(204).send();
});

export const getSignedDownloadUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await storageService.generateSignedDownloadUrl({
      key: getStorageKey(req)
    });

    res.status(200).json(result);
  }
);

function getStorageKey(req: Request): string {
  return decodeURIComponent(req.params.key ?? "");
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }

  return value;
}

function toStringRecord(value: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
