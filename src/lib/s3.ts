import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CompletedPart
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT_URL || "https://t3.storageapi.dev",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, // Needed for many S3-compatible providers
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || "convenient-briefcase-lioy-2";

export async function generateUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  // URL expires in 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function generateDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function createMultipartUpload(key: string, contentType: string) {
  const command = new CreateMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  const res = await s3Client.send(command);
  return res.UploadId;
}

export async function getMultipartPreSignedUrls(key: string, uploadId: string, partsCount: number) {
  const urls = [];
  for (let i = 1; i <= partsCount; i++) {
    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: i,
    });
    // Each part URL expires in 3 hours to allow enough time for large uploads
    const url = await getSignedUrl(s3Client, command, { expiresIn: 10800 });
    urls.push({ partNumber: i, url });
  }
  return urls;
}

export async function completeMultipartUploadAction(key: string, uploadId: string, parts: CompletedPart[]) {
  const command = new CompleteMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });
  return await s3Client.send(command);
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  const command = new AbortMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
  });
  return await s3Client.send(command);
}

