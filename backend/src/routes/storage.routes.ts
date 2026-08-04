import { Router } from "express";

import {
  deleteFile,
  downloadFile,
  getSignedDownloadUrl,
  uploadFile
} from "../controllers/storage.controller";
import { authenticate } from "../middleware/authenticate";

export const storageRouter = Router();

storageRouter.post("/upload", authenticate, uploadFile);
storageRouter.get("/download/:key", authenticate, downloadFile);
storageRouter.delete("/:key", authenticate, deleteFile);
storageRouter.get("/signed-url/:key", authenticate, getSignedDownloadUrl);
