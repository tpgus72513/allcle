# ⚾ allcle — 야구 티켓팅 시뮬레이터

> KBO 티켓팅 실전 훈련 시뮬레이터
> 팀: **올클(allcle)** · 발표 2026.06.08

실제 티켓팅 플로우(로그인 → 경기 선택 → 대기열 → CAPTCHA → 좌석 선택 → 결제 → 결과)를
그대로 재현해 "올 클리어(좌석 사수)"를 훈련시키는 웹 시뮬레이터.

---

## 📂 레포 구조 (monorepo)

```
allcle/
├── README.md            # 이 파일
├── .gitignore
├── docs/                # 설계 문서 (소스 오브 트루스)
│   ├── ERD.md           # DB 스키마 + PostgreSQL DDL
│   └── API.md           # REST API 명세 v1 (11개 엔드포인트)
├── frontend/            # Next.js + TypeScript (create-next-app으로 초기화)
│   └── README.md
└── backend/             # Express + TypeScript
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── README.md
    └── src/
        ├── index.ts          # 서버 진입점
        ├── app.ts            # Express 앱 설정
        ├── config/
        │   └── supabase.ts   # Supabase 클라이언트
        ├── routes/           # API 라우트 (도메인별)
        ├── services/
        │   └── queue.service.ts  # 대기열 시뮬레이션 로직 (핵심)
        ├── middlewares/
        │   └── errorHandler.ts
        └── types/
```

> **왜 모노레포?** FE 2명·BE 1명·16일짜리 소규모라 레포 하나에 모으는 게 PR·이슈·문서 관리가 단순함. 분리하면 두 곳을 따로 챙겨야 해서 오버헤드.

---

## 🛠 기술 스택

| 영역 | 스택 |
|------|------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| DB | Supabase (PostgreSQL) |
| 배포 | Vercel (FE) / Railway · Render (BE) |

---

## 🚀 빠른 시작

```bash
# 1. 클론
git clone https://github.com/<팀계정>/allcle.git
cd allcle

# 2. 백엔드
cd backend
npm install
cp .env.example .env        # Supabase 키 채우기
npm run dev                 # http://localhost:4000

# 3. 프론트엔드 (새 터미널)
cd frontend
# frontend/README.md 참고해 create-next-app으로 초기화
npm run dev                 # http://localhost:3000
```

---

## 🌿 브랜치 전략 (간단 버전)

- `main` — 항상 동작하는 상태 유지. 직접 푸시 ❌
- 작업은 브랜치 파서 PR로 merge:
  - `feat/queue-logic`, `feat/seat-map`, `docs/spec-v1` 처럼 `타입/내용`
- 커밋 메시지: `feat:`, `fix:`, `docs:`, `chore:` 접두어 (안 정했으면 평범한 문장도 OK)

---

## 👥 역할

| 담당 | 영역 |
|------|------|
| FE 1 | 페이지 라우팅·대기열·CAPTCHA UI |
| FE 2 | 좌석맵 SVG·결과 공유 카드 |
| BE | API·DB·대기열 시뮬레이션 로직·배포 |

---

## 📌 다음 단계

1. `docs/ERD.md`의 DDL로 Supabase 테이블 생성
2. `backend/src/routes/`의 스텁을 실제 구현으로 채우기
3. `frontend/` create-next-app 초기화 + 페이지 7개 라우팅


## Frontend 셋업
# allcle — Frontend (Next.js + TypeScript)

> 이 폴더는 아직 비어 있어. 아래 명령으로 Next.js 프로젝트를 **이 폴더 안에** 초기화하면 돼.

## 셋업

```bash
# frontend/ 폴더 안에서 (현재 위치에 생성하므로 마지막 점(.) 주의)
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir

# 추가 라이브러리
npm install framer-motion   # 대기열·전환 애니메이션
npm install html2canvas     # 결과 공유 카드 이미지 export
```

실행:

```bash
npm run dev     # http://localhost:3000
```

## 권장 페이지 구조 (App Router)

티켓팅 플로우 7단계를 페이지로 매핑:

```
src/app/
├── page.tsx            # 홈 (구단 선택 진입)
├── matches/page.tsx    # 경기 선택
├── queue/page.tsx      # 대기열 (1초마다 /api/simulation/:id/queue polling)
├── captcha/page.tsx    # CAPTCHA
├── seats/page.tsx      # 좌석 선택 (SVG 좌석맵)
├── payment/page.tsx    # 결제 (3분 타이머)
└── result/page.tsx     # 결과 + 공유 카드
```

권장 폴더:

```
src/
├── app/                # 위 페이지들
├── components/         # 공용 컴포넌트 (SeatMap, QueueCounter, ResultCard ...)
├── lib/                # api 클라이언트, 유틸
└── styles/             # 전역 스타일 (구단별 컬러 토큰 등)
```

## 환경변수

백엔드 주소를 `.env.local`에 둬:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

## API 연동

엔드포인트 명세는 `../docs/API.md` 참고. 좌석맵 SVG는 `GET /api/stadiums/:id/sections`의 `svgPath`를 그대로 `<path d={svgPath} />`로 렌더링하면 됨.

