import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";

import { storageConfig } from "../../src/config/storage";
import { storageService } from "../../src/services/storage";
const {
  deleteFile,
  fileExists,
  generateSignedDownloadUrl,
  getFileMetadata,
  uploadFile
} = storageService;

const describeS3 =
  process.env.RUN_AWS_INTEGRATION_TESTS === "true" ? describe : describe.skip;

describeS3("S3 storage integration", () => {
  it("uploads, reads, downloads, and deletes a uniquely keyed object", async () => {
    const contents = Buffer.from(`ProofPay S3 verification ${randomUUID()}`, "utf8");
    let key: string | undefined;

    try {
      const upload = await uploadFile({
        fileName: "storage-verification.txt",
        contentType: "text/plain",
        body: contents,
        keyPrefix: "integration-tests",
        metadata: { verification: "true" }
      });
      key = upload.key;

      expect(upload.bucket).toBe(storageConfig.bucket);
      expect(upload.key).toMatch(/^integration-tests\//);
      expect(upload.contentType).toBe("text/plain");
      expect(upload.size).toBe(contents.byteLength);
      await expect(fileExists({ key })).resolves.toBe(true);

      const metadata = await getFileMetadata({ key });
      expect(metadata.bucket).toBe(storageConfig.bucket);
      expect(metadata.contentType).toBe("text/plain");
      expect(metadata.contentLength).toBe(contents.byteLength);
      expect(metadata.metadata).toMatchObject({ verification: "true" });

      const download = await generateSignedDownloadUrl({ key });
      const response = await fetch(download.url);

      expect(response.ok).toBe(true);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(contents);
    } finally {
      if (key !== undefined) {
        await deleteFile({ key });
        await expect(fileExists({ key })).resolves.toBe(false);
      }
    }
  });
});
