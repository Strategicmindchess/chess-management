import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const {
  S3_ENDPOINT_URL,
  S3_REGION,
  S3_BUCKET_NAME,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
} = process.env;

if (!S3_ENDPOINT_URL || !S3_BUCKET_NAME || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error("Missing required S3 environment variables.");
  process.exit(1);
}

const s3Client = new S3Client({
  region: S3_REGION || "auto",
  endpoint: S3_ENDPOINT_URL,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  // Tigris/Railway S3 might need path styling depending on setup, but typically forcePathStyle is helpful for custom endpoints.
  // forcePathStyle: true,
});

const BASE_DIR = path.resolve(process.cwd(), "class-materials", "SMC_CLASS_PGN");
const UPLOAD_PREFIX = "SMC_CLASS_PGN";

async function getFilesRecursively(dir: string, fileList: string[] = []) {
  const files = await fs.promises.readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.promises.stat(filePath);
    
    if (stat.isDirectory()) {
      await getFilesRecursively(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Map extensions to content types
function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pgn': return 'application/x-chess-pgn';
    case '.pdf': return 'application/pdf';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.txt': return 'text/plain';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    default: return 'application/octet-stream';
  }
}

async function uploadFiles() {
  console.log(`Starting upload from ${BASE_DIR}`);
  
  if (!fs.existsSync(BASE_DIR)) {
    console.error(`Directory not found: ${BASE_DIR}`);
    process.exit(1);
  }

  const files = await getFilesRecursively(BASE_DIR);
  console.log(`Found ${files.length} files to upload.`);

  let successCount = 0;
  let failCount = 0;

  for (const filePath of files) {
    // Determine the S3 key (path in bucket)
    // Relative to BASE_DIR, e.g., "Beginner level/file.pgn"
    const relativePath = path.relative(BASE_DIR, filePath);
    
    // Normalize path separators to forward slashes for S3
    const s3Key = `${UPLOAD_PREFIX}/${relativePath.replace(/\\/g, "/")}`;
    
    const fileStream = fs.createReadStream(filePath);
    const contentType = getContentType(filePath);

    try {
      console.log(`Uploading: ${s3Key}...`);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileStream,
          ContentType: contentType,
        })
      );
      console.log(`✅ Success: ${s3Key}`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed: ${s3Key} - ${error.message}`);
      failCount++;
    }
  }

  console.log(`\nUpload complete!`);
  console.log(`Successfully uploaded: ${successCount}`);
  console.log(`Failed to upload: ${failCount}`);
}

uploadFiles().catch(console.error);
