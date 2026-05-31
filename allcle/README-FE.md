# allcle frontend — FE-2 작업본 (1~4단계)

이 폴더는 **기존 `create-next-app` 프로젝트의 `src/` 안에 합치는** 용도예요.
(레이아웃/globals.css가 이미 있으면 덮어쓰지 말고 비교해서 병합하세요.)

## 1. 설치
```bash
npm install zustand
npm install html2canvas   # 결과 카드 이미지 저장(Sprint 2)용
```

## 2. 환경변수 (.env.local)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_USE_MOCK=true     # ← 2단계: mock으로 UI 작업
# 금요일 통합의 날엔 false 로 바꾸면 실제 BE 호출 (3단계)
```

## 3. 실행
```bash
npm run dev
```
홈(`/`)에서 닉네임 입력 → 팀 선택 → 경기 → 대기열 → 캡차 → **좌석 → 결제 → 결과**까지
mock으로 끊김 없이 흐릅니다. (= Sprint 1 E2E 목표)

## 폴더 구조
```
src/
├─ lib/
│  ├─ types.ts      # 백엔드 응답 타입 단일 소스 (BE 확정 시 여기만 수정)
│  ├─ api.ts        # fetch 래퍼: 토큰 헤더 + {success,data,error} 언래핑 + 409 처리
│  ├─ mock.ts       # docs/API.md 응답 형태 mock
│  └─ services.ts   # ★ mock ↔ 실제 API 전환 단일 지점 ★
├─ store/
│  └─ useFlowStore.ts  # team→match→simId→seat→score (Zustand)
├─ components/
│  ├─ SeatMap.tsx     # [FE-2] 좌석맵 (Sprint2엔 SectionTile만 SVG로 교체)
│  └─ ResultCard.tsx  # [FE-2] 결과 공유 카드 + html2canvas
└─ app/
- **FE-1**: `page/match/queue/captcha` 의 디자인·카피·캡차 UI 채우기.
   ├─ page.tsx        # 홈        [FE-1 골격]
   ├─ match/          # 경기선택   [FE-1 골격]
   ├─ queue/          # 대기열     [FE-1 골격]
   ├─ captcha/        # CAPTCHA   [FE-1 골격]
   ├─ seat/           # 좌석선택   [FE-2 완성]
   ├─ payment/        # 결제      [FE-2 완성]
   └─ result/         # 결과      [FE-2 완성]
```

## 분업 메모
- **공통 기반(lib/*, store/*)** 은 FE-1과 같이 쓰는 부분. 월요일에 합의.
  캡차는 `services.ts`에 `issueCaptcha/submitCaptcha` 추가해 연결.
- **FE-2**: `seat/payment/result` 완성. Sprint 2에 SVG + html2canvas 고도화.

## BE에 확인할 것 (코드에 `⚠️`로 표시됨)
1. `GET /:id/seats` 응답 예시 — `svgPath`가 같이 오나? `soldOut` 필드명?
2. 409 SEAT_SOLD_OUT 은 "이미 매진인 구역 눌렀을 때만" 뜨나?
3. `GET /:id/result` 에 `rank`가 들어오나? (리더보드 미구현이면 null 처리)
