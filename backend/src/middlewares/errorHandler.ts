import { Request, Response, NextFunction } from 'express';

// 모든 라우트의 try/catch에서 next(err)로 넘어온 에러를 한곳에서 처리
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
}
