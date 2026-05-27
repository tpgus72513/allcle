import { RequestHandler } from 'express';
import { verifySession } from '../utils/jwt';

/**
 * 토큰이 있으면 채우고, 없거나 잘못된 토큰이어도 그냥 통과.
 * 리더보드처럼 "비로그인도 보이지만 로그인 시 myRank 추가" 패턴.
 */
export const authOptional: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    try {
      const payload = verifySession(token);
      req.user = { id: payload.sub, nickname: payload.nickname };
    } catch {
      // 무시
    }
  }
  next();
};
