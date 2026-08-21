'use server';

import { requireRole } from "@/lib/dal";
import { s3Client, BUCKET_NAME, generateDownloadUrl } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export interface S3Item {
  key: string;
  name: string;
  type: 'folder' | 'file';
  size?: number;
  lastModified?: Date;
}

export async function listS3Folder(prefix: string): Promise<S3Item[]> {
  await requireRole(['ADMIN', 'TEACHER']);

  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);
    const items: S3Item[] = [];

    // Add folders
    if (response.CommonPrefixes) {
      for (const p of response.CommonPrefixes) {
        if (p.Prefix) {
          items.push({
            key: p.Prefix,
            name: p.Prefix.replace(prefix, "").replace(/\/$/, ""),
            type: "folder",
          });
        }
      }
    }

    // Add files
    if (response.Contents) {
      for (const f of response.Contents) {
        if (f.Key && f.Key !== prefix) { // Exclude the directory itself if it exists as an object
          items.push({
            key: f.Key,
            name: f.Key.replace(prefix, ""),
            type: "file",
            size: f.Size,
            lastModified: f.LastModified,
          });
        }
      }
    }

    items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    return items;
  } catch (error) {
    console.error("Error listing S3 folder:", error);
    throw new Error("Failed to list folder contents.");
  }
}

export async function getS3DownloadUrls(keys: string[]): Promise<string[]> {
  await requireRole(['ADMIN', 'TEACHER']);
  
  try {
    const urls = await Promise.all(keys.map(key => generateDownloadUrl(key)));
    return urls;
  } catch (error) {
    console.error("Error generating presigned URLs:", error);
    throw new Error("Failed to generate download links.");
  }
}
