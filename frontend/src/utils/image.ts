const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_EDGE = 1600;
const CONTRAST_FACTOR = 8.8;
const CONTRAST_MIDPOINT = 180;

function boostContrast(imageData: ImageData): void {
  const pixels = imageData.data;
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = Math.max(
      0,
      Math.min(255, (pixels[index] - CONTRAST_MIDPOINT) * CONTRAST_FACTOR + CONTRAST_MIDPOINT)
    );
    pixels[index + 1] = Math.max(
      0,
      Math.min(
        255,
        (pixels[index + 1] - CONTRAST_MIDPOINT) * CONTRAST_FACTOR + CONTRAST_MIDPOINT
      )
    );
    pixels[index + 2] = Math.max(
      0,
      Math.min(
        255,
        (pixels[index + 2] - CONTRAST_MIDPOINT) * CONTRAST_FACTOR + CONTRAST_MIDPOINT
      )
    );
  }
}

export function fileToScanDataUrl(file: File): Promise<string> {
  if (!file || file.size === 0) {
    return Promise.reject(new Error("A bill image is required."));
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Promise.reject(new Error("Image must be JPG, PNG, or WEBP."));
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const longest = Math.max(image.width, image.height) || 1;
        const scale = Math.min(1, MAX_EDGE / longest);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not process this image."));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);
        boostContrast(imageData);
        context.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        reject(new Error("Could not process this image."));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not process this image."));
    };

    image.src = objectUrl;
  });
}
