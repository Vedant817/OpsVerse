import "server-only";

export const supportedImageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const maxImageBytes = 2 * 1024 * 1024;

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

function parseDataUri(dataUri: string) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUri.trim());

  if (!match) {
    throw new ImageValidationError(
      "Image evidence must be a base64 data URI with an image MIME type.",
    );
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

export function validateImageDataUri(dataUri: string, label: string) {
  if (!dataUri.trim()) {
    return null;
  }

  const parsed = parseDataUri(dataUri);

  if (
    !supportedImageMimeTypes.includes(
      parsed.mimeType as (typeof supportedImageMimeTypes)[number],
    )
  ) {
    throw new ImageValidationError(
      `${label} must be PNG, JPEG, or WebP. Received ${parsed.mimeType}.`,
    );
  }

  const sizeBytes = Buffer.byteLength(parsed.base64, "base64");

  if (sizeBytes > maxImageBytes) {
    throw new ImageValidationError(
      `${label} must be ${maxImageBytes / (1024 * 1024)}MB or smaller.`,
    );
  }

  return {
    dataUri: `data:${parsed.mimeType};base64,${parsed.base64}`,
    mimeType: parsed.mimeType,
    sizeBytes,
  };
}

export function validateIncidentImageEvidence({
  screenshotDataUri,
  videoFrameDataUri,
}: {
  screenshotDataUri?: string;
  videoFrameDataUri?: string;
}) {
  validateImageDataUri(screenshotDataUri ?? "", "Screenshot image");
  validateImageDataUri(videoFrameDataUri ?? "", "Video frame image");
}
