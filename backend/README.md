# allcle — Backend (Express + TypeScript)

야구 티켓팅 시뮬레이터 API 서버. DB는 Supabase(PostgreSQL).

## 셋업

```bash
npm install
cp .env.example .env     # Supabase URL / Service Role Key 채우기
npm run dev              # tsx watch — 파일 저장 시 자동 재시작
```

- 서버: `http://localhost:4000`
- 헬스체크: `GET /health` → `{ "ok": true }`

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 모드 (자동 재시작) |
| `npm run build` | `tsc`로 `dist/` 빌드 |
| `npm start` | 빌드 결과 실행 (배포용) |

## 구조

```
src/
├── index.ts              # 진입점 (서버 listen)
├── app.ts                # Express 앱 (미들웨어 + 라우트 등록)
├── config/supabase.ts    # Supabase 클라이언트
├── routes/               # 도메인별 라우트
│   ├── index.ts          # 라우트 통합 (/api 하위)
│   ├── auth.routes.ts
│   ├── teams.routes.ts       # ← 실제 구현 예시 들어있음
│   ├── matches.routes.ts
│   ├── stadiums.routes.ts
│   ├── simulation.routes.ts  # 시뮬레이션 6개 엔드포인트
│   └── leaderboard.routes.ts
├── services/
│   └── queue.service.ts  # 대기열 시뮬레이션 (결정론적 계산)
├── middlewares/
│   └── errorHandler.ts   # 공용 에러 핸들러
└── types/index.ts        # 공용 타입 (Difficulty, Grade)
```

## 구현 순서 (참고)

1. `docs/ERD.md`의 DDL을 Supabase SQL Editor에 붙여 테이블 + `leaderboard` view 생성
2. `teams.routes.ts`를 참고해 나머지 라우트의 `// TODO` 채우기
3. 대기열은 `queue.service.ts`가 거의 다 돼 있음 — `start` 시 `simId`별 `{ difficulty, startedAt }`만 저장하면 됨 (MVP는 메모리 Map으로 충분)

> 규모가 커지면 라우트의 핸들러를 `controllers/`로 분리하는 패턴을 권장하지만, 이 MVP에선 라우트에 인라인으로 둬도 충분합니다.
