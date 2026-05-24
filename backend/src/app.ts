import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

// 헬스체크
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// /api 하위로 모든 라우트 등록
app.use('/api', routes);

// 에러 핸들러는 항상 맨 마지막
app.use(errorHandler);

export default app;
