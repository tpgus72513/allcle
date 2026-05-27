import { RequestHandler } from 'express';
import { HttpError } from '../utils/apiResponse';
import { verifySession } from '../utils/jwt';

/**
 * Express Request에 user를 끼워 넣기 위한 모듈 확장.
 * controller에서 `req.user.id` (uuid string)로 접근.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; nickname: string };
    }
  }
}

/**
 * 인증 필수 — 토큰 없거나 잘못되면 401.
 */
export const authRequired: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'UNAUTHORIZED', '인증 토큰이 필요합니다.'));
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifySession(token);
    req.user = { id: payload.sub, nickname: payload.nickname };
    next();
  } catch (err) {
    next(err);
  }
};
