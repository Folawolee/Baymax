const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

export interface CompressedImage {
  /** `data:image/jpeg;base64,...` — ready for <img src> or for stripping to raw base64. */
  dataUrl: string;
  mimeType: "image/jpeg";
}

/**
 * Downscale + re-encode an image file client-side via the Canvas API before it
 * ever leaves the browser — keeps receipt/photo payloads small with zero
 * server round-trip and no new dependency. Longest edge capped at
 * MAX_DIMENSION, re-encoded as JPEG at JPEG_QUALITY.
 */
export function compressImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas is not supported in this browser"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY), mimeType: "image/jpeg" });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Strips the `data:<mime>;base64,` prefix — backend attachment endpoints want raw base64. */
export function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
}
