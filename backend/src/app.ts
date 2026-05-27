import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsMiddleware } from './config/cors';
import { env } from './config/env';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/notFound.middleware';
import apiV1 from './routes';

const app = express();

// 보안 헤더 — XSS, clickjacking 등 기본 방어
app.use(helmet());

// CORS — 라우터보다 먼저 와야 프리플라이트 처리 가능
app.use(corsMiddleware);

// JSON 파싱
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 로깅 — 개발은 dev, 운영은 combined
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// API v1
app.use('/api/v1', apiV1);

// 404 → 에러 핸들러 순서 중요
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
