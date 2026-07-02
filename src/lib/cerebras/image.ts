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

export type ValidatedImageDataUri = {
  dataUri: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

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

function readUint24Le(buffer: Buffer, offset: number) {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function pngDimensions(buffer: Buffer) {
  const pngSignature = "89504e470d0a1a0a";

  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).toString("hex") === pngSignature &&
    buffer.subarray(12, 16).toString("ascii") === "IHDR"
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  return null;
}

function jpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    offset += 2;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 2 > buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break;
    }

    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += segmentLength;
  }

  return null;
}

function webpDimensions(buffer: Buffer) {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    return null;
  }

  const chunkType = buffer.subarray(12, 16).toString("ascii");

  if (chunkType === "VP8X" && buffer.length >= 30) {
    return {
      width: readUint24Le(buffer, 24) + 1,
      height: readUint24Le(buffer, 27) + 1,
    };
  }

  if (chunkType === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunkType === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];

    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }

  return null;
}

function imageDimensions(mimeType: string, base64: string) {
  const buffer = Buffer.from(base64, "base64");

  if (mimeType === "image/png") {
    return pngDimensions(buffer);
  }

  if (mimeType === "image/jpeg") {
    return jpegDimensions(buffer);
  }

  if (mimeType === "image/webp") {
    return webpDimensions(buffer);
  }

  return null;
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

  const dimensions = imageDimensions(parsed.mimeType, parsed.base64);

  return {
    dataUri: `data:${parsed.mimeType};base64,${parsed.base64}`,
    mimeType: parsed.mimeType,
    sizeBytes,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  } satisfies ValidatedImageDataUri;
}

export function validateIncidentImageEvidence({
  screenshotDataUri,
  videoFrameDataUri,
  videoFrameDataUris,
}: {
  screenshotDataUri?: string;
  videoFrameDataUri?: string;
  videoFrameDataUris?: string[];
}) {
  validateImageDataUri(screenshotDataUri ?? "", "Screenshot image");
  validateImageDataUri(videoFrameDataUri ?? "", "Video frame image");
  for (const [index, dataUri] of (videoFrameDataUris ?? []).entries()) {
    validateImageDataUri(dataUri, `Video frame image ${index + 1}`);
  }
}
