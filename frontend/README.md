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
