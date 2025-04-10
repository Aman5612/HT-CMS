import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: file,
    ContentType: contentType,
    ACL: "public-read",
  });

  await s3Client.send(command);

  // Return CloudFront URL
  return `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${fileName}`;
}
