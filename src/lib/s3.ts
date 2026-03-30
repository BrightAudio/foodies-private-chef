// AWS S3 client for cloud file storage
// Phase 4: Replace local uploads with S3

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const isS3Configured = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET
);

let s3: S3Client | null = null;

if (isS3Configured) {
  s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = process.env.AWS_S3_BUCKET || "foodies-uploads";
const REGION = process.env.AWS_REGION || "us-east-1";

export function isS3Enabled(): boolean {
  return isS3Configured && s3 !== null;
}

export async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string = "uploads"
): Promise<{ url: string; key: string }> {
  if (!s3) throw new Error("S3 not configured");

  const key = `${folder}/${uuidv4()}-${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { url, key };
}

export async function uploadImageToS3(
  buffer: Buffer,
  originalFilename: string,
  contentType: string
): Promise<{ url: string; thumbUrl: string; key: string; thumbKey: string }> {
  if (!s3) throw new Error("S3 not configured");

  try {
    // Dynamic import sharp for image optimization
    const sharp = (await import("sharp")).default;

    // Full-size optimized
    const optimized = await sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const mainResult = await uploadToS3(optimized, originalFilename.replace(/\.\w+$/, ".jpg"), "image/jpeg", "images");

    // Thumbnail
    const thumb = await sharp(buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const thumbResult = await uploadToS3(thumb, originalFilename.replace(/\.\w+$/, ".jpg"), "image/jpeg", "thumbnails");

    return {
      url: mainResult.url,
      thumbUrl: thumbResult.url,
      key: mainResult.key,
      thumbKey: thumbResult.key,
    };
  } catch {
    // Sharp not available — upload raw
    const result = await uploadToS3(buffer, originalFilename, contentType, "images");
    return { url: result.url, thumbUrl: result.url, key: result.key, thumbKey: result.key };
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  if (!s3) throw new Error("S3 not configured");
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
