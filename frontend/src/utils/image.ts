const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_EDGE = 1600;

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
