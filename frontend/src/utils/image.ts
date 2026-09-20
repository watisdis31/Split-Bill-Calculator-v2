const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_EDGE = 1600;
const CLAHE_GRID_SIZE = 8;
const CLAHE_BINS = 256;
const CLAHE_CLIP_FACTOR = 2;
const BACKGROUND_RADIUS = 15;

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function buildLuminance(imageData: ImageData): Uint8Array {
  const pixels = imageData.data;
  const luminance = new Uint8Array(pixels.length / 4);
  for (let pixel = 0, index = 0; index < pixels.length; pixel += 1, index += 4) {
    luminance[pixel] = clamp(
      pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114
    );
  }
  return luminance;
}

function subtractBackground(luminance: Uint8Array, width: number, height: number): Uint8Array {
  const stride = width + 1;
  const integral = new Uint32Array(stride * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let rowTotal = 0;
    for (let x = 1; x <= width; x += 1) {
      rowTotal += luminance[(y - 1) * width + x - 1];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowTotal;
    }
  }

  const corrected = new Uint8Array(luminance.length);
  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - BACKGROUND_RADIUS);
    const bottom = Math.min(height - 1, y + BACKGROUND_RADIUS);
    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - BACKGROUND_RADIUS);
      const right = Math.min(width - 1, x + BACKGROUND_RADIUS);
      const area = (right - left + 1) * (bottom - top + 1);
      const background =
        (integral[(bottom + 1) * stride + right + 1] -
          integral[top * stride + right + 1] -
          integral[(bottom + 1) * stride + left] +
          integral[top * stride + left]) /
        area;
      corrected[y * width + x] = clamp(luminance[y * width + x] + (255 - background));
    }
  }
  return corrected;
}

function createClaheMaps(luminance: Uint8Array, width: number, height: number): Uint8Array[] {
  const maps: Uint8Array[] = [];
  for (let tileY = 0; tileY < CLAHE_GRID_SIZE; tileY += 1) {
    const top = Math.floor((tileY * height) / CLAHE_GRID_SIZE);
    const bottom = Math.max(top + 1, Math.floor(((tileY + 1) * height) / CLAHE_GRID_SIZE));
    for (let tileX = 0; tileX < CLAHE_GRID_SIZE; tileX += 1) {
      const left = Math.floor((tileX * width) / CLAHE_GRID_SIZE);
      const right = Math.max(left + 1, Math.floor(((tileX + 1) * width) / CLAHE_GRID_SIZE));
      const histogram = new Uint32Array(CLAHE_BINS);
      for (let y = top; y < bottom && y < height; y += 1) {
        for (let x = left; x < right && x < width; x += 1) {
          histogram[luminance[y * width + x]] += 1;
        }
      }

      const tilePixels = Math.max(1, (bottom - top) * (right - left));
      const clipLimit = Math.max(1, Math.round((CLAHE_CLIP_FACTOR * tilePixels) / CLAHE_BINS));
      let excess = 0;
      for (let bin = 0; bin < CLAHE_BINS; bin += 1) {
        if (histogram[bin] > clipLimit) {
          excess += histogram[bin] - clipLimit;
          histogram[bin] = clipLimit;
        }
      }
      const redistributed = Math.floor(excess / CLAHE_BINS);
      let remainder = excess % CLAHE_BINS;
      for (let bin = 0; bin < CLAHE_BINS; bin += 1) {
        histogram[bin] += redistributed;
        if (remainder > 0) {
          histogram[bin] += 1;
          remainder -= 1;
        }
      }

      const map = new Uint8Array(CLAHE_BINS);
      let cumulative = 0;
      for (let bin = 0; bin < CLAHE_BINS; bin += 1) {
        cumulative += histogram[bin];
        map[bin] = clamp((cumulative * 255) / tilePixels);
      }
      maps.push(map);
    }
  }
  return maps;
}

function enhanceReceipt(imageData: ImageData, width: number, height: number): void {
  const backgroundCorrected = subtractBackground(buildLuminance(imageData), width, height);
  const maps = createClaheMaps(backgroundCorrected, width, height);
  const pixels = imageData.data;
  for (let y = 0; y < height; y += 1) {
    const gridY = (y / Math.max(1, height - 1)) * (CLAHE_GRID_SIZE - 1);
    const tileY = Math.floor(gridY);
    const nextTileY = Math.min(CLAHE_GRID_SIZE - 1, tileY + 1);
    const yWeight = gridY - tileY;
    for (let x = 0; x < width; x += 1) {
      const gridX = (x / Math.max(1, width - 1)) * (CLAHE_GRID_SIZE - 1);
      const tileX = Math.floor(gridX);
      const nextTileX = Math.min(CLAHE_GRID_SIZE - 1, tileX + 1);
      const xWeight = gridX - tileX;
      const value = backgroundCorrected[y * width + x];
      const topLeft = maps[tileY * CLAHE_GRID_SIZE + tileX][value];
      const topRight = maps[tileY * CLAHE_GRID_SIZE + nextTileX][value];
      const bottomLeft = maps[nextTileY * CLAHE_GRID_SIZE + tileX][value];
      const bottomRight = maps[nextTileY * CLAHE_GRID_SIZE + nextTileX][value];
      const top = topLeft + (topRight - topLeft) * xWeight;
      const bottom = bottomLeft + (bottomRight - bottomLeft) * xWeight;
      const enhanced = clamp(top + (bottom - top) * yWeight);
      const index = (y * width + x) * 4;
      pixels[index] = enhanced;
      pixels[index + 1] = enhanced;
      pixels[index + 2] = enhanced;
    }
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
        enhanceReceipt(imageData, width, height);
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
