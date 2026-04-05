// Client-side image compression before upload
// Reduces file size using canvas resize + JPEG quality reduction

const MAX_DIMENSION = 1200;
const QUALITY = 0.8;

export function compressImage(file: File, maxDimension = MAX_DIMENSION, quality = QUALITY): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip non-image or small files
    if (!file.type.startsWith("image/") || file.size < 100_000) {
      return resolve(file);
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Skip if already small enough
      if (width <= maxDimension && height <= maxDimension && file.size < 500_000) {
        return resolve(file);
      }

      // Scale down proportionally
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression didn't help, use original
            return resolve(file);
          }
          const compressed = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
