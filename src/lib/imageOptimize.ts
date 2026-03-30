// Image optimization
// Improvement #22: Resize and compress uploaded images

import path from "path";
import { writeFile, mkdir } from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const THUMB_DIR = path.join(process.cwd(), "public", "uploads", "thumbs");

interface OptimizedResult {
  url: string;
  thumbUrl: string;
}

/**
 * Optimize an uploaded image: resize to max 1200px wide, create 400px thumbnail.
 * Uses sharp if available, falls back to saving original.
 */
export async function optimizeImage(buffer: Buffer, filename: string): Promise<OptimizedResult> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await mkdir(THUMB_DIR, { recursive: true });

  try {
    // Dynamic import to gracefully handle if sharp isn't installed
    const sharp = (await import("sharp")).default;

    // Main image: resize to max 1200px wide, compress JPEG quality 80
    const optimized = await sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const optimizedFilename = filename.replace(/\.\w+$/, ".jpg");
    await writeFile(path.join(UPLOAD_DIR, optimizedFilename), optimized);

    // Thumbnail: 400px wide
    const thumb = await sharp(buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    await writeFile(path.join(THUMB_DIR, optimizedFilename), thumb);

    return {
      url: `/uploads/${optimizedFilename}`,
      thumbUrl: `/uploads/thumbs/${optimizedFilename}`,
    };
  } catch {
    // Sharp not available — save original
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    return {
      url: `/uploads/${filename}`,
      thumbUrl: `/uploads/${filename}`,
    };
  }
}
