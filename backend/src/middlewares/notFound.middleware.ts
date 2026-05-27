import { RequestHandler } from 'express';
import { fail } from '../utils/apiResponse';

export const notFoundMiddleware: RequestHandler = (req, res) => {
  res.status(404).json(fail('NOT_FOUND', `${req.method} ${req.originalUrl} 경로를 찾을 수 없습니다.`));
};
