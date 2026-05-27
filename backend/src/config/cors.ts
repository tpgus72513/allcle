import cors, { CorsOptions } from 'cors';
import { env } from './env';

/**
 * CORS 정책.
 * - 환경변수 CORS_ORIGINS의 화이트리스트와 비교.
 * - 개발 모드일 때만 Origin 헤더가 없는 요청 (Postman, curl 등)을 허용.
 * - credentials: true → FE에서 Authorization 헤더 보낼 때 필수.
 */
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      if (env.NODE_ENV !== 'production') return callback(null, true);
      return callback(new Error('Origin header required'));
    }
    if (env.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
};

export const corsMiddleware = cors(corsOptions);
