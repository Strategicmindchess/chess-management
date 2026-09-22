import { s3Client, BUCKET_NAME } from '../src/lib/s3';
import { CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function main() {
  console.log("Listing files in SMC_CLASS_PGN/...");
  const listCmd = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: 'SMC_CLASS_PGN/',
  });
  
  const response = await s3Client.send(listCmd);
  const files = response.Contents || [];
  
  for (const file of files) {
    if (!file.Key) continue;
    
    console.log("Found:", file.Key);
    const lowerName = file.Key.toLowerCase();
    
    if (lowerName.includes('assignment')) {
      const newKey = file.Key.replace('SMC_CLASS_PGN/', 'SMC_ASSIGNMENT/');
      console.log(`Copying ${file.Key} to ${newKey}`);
      
      await s3Client.send(new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${file.Key}`,
        Key: newKey,
      }));
      
      console.log(`Deleting original ${file.Key}`);
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: file.Key,
      }));
    }
    
    if (lowerName.includes('lesson plan')) {
      console.log(`Deleting ${file.Key}`);
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: file.Key,
      }));
    }
  }
  console.log("Done.");
}

main().catch(console.error);
