import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from './apiResponse';

/**
 * 익명 세션용 JWT 토큰 발급/검증.
 * payload에 userId(uuid)와 nickname을 담는다.
 * refresh 토큰은 안 쓰고 단일 토큰을 길게 (기본 7일).
 */

export interface SessionPayload extends JwtPayload {
  sub: string;        // userId (uuid)
  nickname: string;
}

export const signSession = (userId: string, nickname: string): string =>
  jwt.sign({ nickname }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);

export const verifySession = (token: string): SessionPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new HttpError(401, 'UNAUTHORIZED', '잘못된 토큰입니다.');
    }
    return decoded as SessionPayload;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new HttpError(401, 'UNAUTHORIZED', '토큰이 만료되었습니다. 다시 입장해주세요.');
    }
    throw new HttpError(401, 'UNAUTHORIZED', '인증에 실패했습니다.');
  }
};
