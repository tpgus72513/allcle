/**
 * 공통 응답 포맷 — API 명세서 §0
 * { success, data, error, timestamp }
 */

export interface ApiError {
  code: string;
  message: string;
  [key: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
  timestamp: string;
}

export interface ApiFailure {
  success: false;
  data: null;
  error: ApiError;
  timestamp: string;
}

export const ok = <T>(data: T): ApiSuccess<T> => ({
  success: true,
  data,
  error: null,
  timestamp: new Date().toISOString(),
});

export const fail = (code: string, message: string, extra?: Record<string, unknown>): ApiFailure => ({
  success: false,
  data: null,
  error: { code, message, ...(extra ?? {}) },
  timestamp: new Date().toISOString(),
});

/**
 * throw 가능한 표준 에러. controller/routes 안에서:
 *   throw new HttpError(404, 'NOT_FOUND', '...');
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
