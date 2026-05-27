import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { fail, HttpError } from '../utils/apiResponse';

/**
 * 전역 에러 핸들러. 모든 throw는 여기로 모임.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json(fail(err.code, err.message, err.extra));
  }

  if (err instanceof ZodError) {
    return res
      .status(400)
      .json(fail('INVALID_REQUEST', '요청 형식이 올바르지 않습니다.', { issues: err.flatten() }));
  }

  // eslint-disable-next-line no-console
  console.error('[UnhandledError]', err);
  return res.status(500).json(fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.'));
};
