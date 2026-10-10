import "dotenv/config";
import { S3Client, PutBucketPolicyCommand } from "@aws-sdk/client-s3";

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

if (!BUCKET_NAME) {
  throw new Error("S3_BUCKET_NAME is not set in .env");
}

const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT_URL || "https://t3.storageapi.dev",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

const readOnlyPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "PublicReadGetObject",
      Effect: "Allow",
      Principal: "*",
      Action: ["s3:GetObject"],
      Resource: [
        `arn:aws:s3:::${BUCKET_NAME}/thumbnails/*`,
        `arn:aws:s3:::${BUCKET_NAME}/profile-pictures/*`,
      ],
    },
  ],
};

async function main() {
  console.log(`Setting public read policy for bucket: ${BUCKET_NAME}...`);
  try {
    const command = new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(readOnlyPolicy),
    });

    await s3Client.send(command);
    console.log("✅ Success! Your bucket is now public.");
    console.log("Refresh your website and the images should now be visible!");
  } catch (error) {
    console.error("❌ Failed to set bucket policy:", error);
  }
}

main();
