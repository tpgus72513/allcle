# API 명세 — 야구 티켓팅 시뮬레이터

> **v1** · REST / JSON
> Base URL: `TBD` (배포 후 확정)
> 인증: 익명 세션 토큰 (최초 `POST /api/auth/anonymous`로 발급)

## 엔드포인트 목록

| # | Method | Endpoint | 설명 |
|---|--------|----------|------|
| 1 | POST | `/api/auth/anonymous` | 익명 세션 생성 (닉네임만) |
| 2 | GET | `/api/teams` | KBO 10개 팀 목록 |
| 3 | GET | `/api/matches?teamId=` | 선택한 팀의 예매 가능 경기 |
| 4 | GET | `/api/stadiums/:id/sections` | 구장 구역 정보 + SVG |
| 5 | POST | `/api/simulation/start` | 시뮬레이션 시작 (매치 선택) |
| 6 | GET | `/api/simulation/:simId/queue` | 대기열 진행 상태 (polling) |
| 7 | POST | `/api/simulation/:simId/captcha` | CAPTCHA 제출 |
| 8 | POST | `/api/simulation/:simId/select-seat` | 좌석 선택 시도 |
| 9 | POST | `/api/simulation/:simId/payment` | 결제 시뮬레이션 (3분 타이머) |
| 10 | POST | `/api/simulation/:simId/complete` | 시뮬레이션 종료 + 채점 |
| 11 | GET | `/api/leaderboard?matchId=` | 매치별 랭킹 |

> 응답 필드는 v1에서 합의한 핵심 필드 기준. request body 예시는 구현하면서 조정 가능.

---

## 상세

### 1. `POST /api/auth/anonymous`
익명 세션 생성.

```jsonc
// request
{ "nickname": "광클요정" }
// response
{ "userId": "uuid", "token": "..." }
```

### 2. `GET /api/teams`
KBO 10개 팀 목록.

```jsonc
// response
[{ "id": 1, "name": "LG 트윈스", "color": "#C30452" }]
```

### 3. `GET /api/matches?teamId=`
선택한 팀의 예매 가능 경기 목록.

```jsonc
// response
[{ "id": 1, "date": "2026-04-01T18:30:00Z", "opponent": "두산 베어스", "difficulty": "지옥" }]
```

### 4. `GET /api/stadiums/:id/sections`
구장의 구역 정보 + 좌석맵 SVG.

```jsonc
// response
[{ "id": 1, "name": "1루 응원석", "grade": "VIP", "price": 35000, "svgPath": "M10,10 ..." }]
```

### 5. `POST /api/simulation/start`
매치를 선택해 시뮬레이션 시작. 서버가 대기열 시작 위치를 결정론적으로 부여.

```jsonc
// request
{ "matchId": 1 }
// response
{ "simId": "uuid", "queuePosition": 5824, "estimatedWaitMs": 720000 }
```

### 6. `GET /api/simulation/:simId/queue`
대기열 진행 상태 (FE가 1초마다 polling).

```jsonc
// response
{ "currentPosition": 312, "totalAhead": 311, "ready": false }
```

### 7. `POST /api/simulation/:simId/captcha`
CAPTCHA 제출.

```jsonc
// request
{ "answer": "729104" }
// response
{ "success": true, "nextStep": "select-seat" }
```

### 8. `POST /api/simulation/:simId/select-seat`
좌석(구역) 선택 시도. 이미 매진된 구역이면 실패 + 매진된 구역 목록 반환.

```jsonc
// request
{ "sectionId": 1 }
// response
{ "success": false, "seatInfo": null, "soldOutSections": [1, 3] }
```

### 9. `POST /api/simulation/:simId/payment`
결제 시뮬레이션 (3분 타이머).

```jsonc
// response
{ "success": true, "paymentTime": 41200 }
```

### 10. `POST /api/simulation/:simId/complete`
시뮬레이션 종료 + 채점. 결과를 `simulation_results`에 저장.

```jsonc
// response
{
  "score": 8720,
  "breakdown": { "timeScore": 5000, "mistakePenalty": -300, "gradeBonus": 4020 },
  "rank": "상위 2.3%"
}
```

### 11. `GET /api/leaderboard?matchId=`
매치별 랭킹 (`leaderboard` view 기반).

```jsonc
// response
[{ "nickname": "광클요정", "score": 9120, "section": "1루 응원석" }]
```

---

## 큐 시뮬레이션 로직 노트 (BE)

- 분산 큐(Redis/Bull) **사용 안 함**. 각 유저가 혼자 플레이하므로 결정론적 알고리즘으로 충분.
- `start` 시 서버가 난이도 기반으로 시작 `queuePosition`과 감소 속도를 결정
  - 예: "지옥" = 1초당 100명 감소, "입문" = 1초당 500명 감소
- FE가 1초마다 `/queue` polling → BE는 **경과 시간 기반으로 현재 위치를 계산**해서 응답
- WebSocket 미사용 이유: 단일 유저라 server push 불필요. polling으로 충분하고 구현 비용 약 1/5.

## 채점 (참고)

최종 점수 = 소요 시간 + 실수 횟수 + 좌석 등급 가중치 조합. 구체 가중치는 Sprint 1에서 확정.
