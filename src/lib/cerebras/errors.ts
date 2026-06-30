const retryableStatuses = new Set([408, 409, 429, 500, 502, 503, 504]);

export function cerebrasErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const record = error as { status?: unknown; code?: unknown; message?: unknown };

  if (typeof record.status === "number") {
    return record.status;
  }

  if (typeof record.code === "number") {
    return record.code;
  }

  if (typeof record.message === "string") {
    const statusMatch = record.message.match(/\b([1-5]\d{2})\s+status code\b/i);
    if (statusMatch) {
      return Number(statusMatch[1]);
    }
  }

  return null;
}

export function retryDelayMs(error: unknown, attempt: number, baseDelayMs: number) {
  if (typeof error === "object" && error !== null) {
    const headers = (error as { headers?: unknown }).headers;
    const retryAfter =
      headers instanceof Headers
        ? headers.get("retry-after")
        : typeof headers === "object" && headers !== null
          ? (headers as Record<string, string | undefined>)["retry-after"]
          : null;

    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.min(seconds * 1000, 30_000);
      }
    }
  }

  return Math.min(baseDelayMs * attempt, 30_000);
}

export function isRetryableCerebrasError(error: unknown) {
  const status = cerebrasErrorStatus(error);
  return status !== null && retryableStatuses.has(status);
}
