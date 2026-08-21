import { s3Client, BUCKET_NAME } from '../src/lib/s3';
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

async function run() {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: "SMC_CLASS_PGN/",
    Delimiter: "/",
  });

  const response = await s3Client.send(command);
  console.log(JSON.stringify({
    prefixes: response.CommonPrefixes,
    contents: response.Contents?.map(c => c.Key),
  }, null, 2));
}

run().catch(console.error);
