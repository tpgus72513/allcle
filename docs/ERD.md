# ERD — 야구 티켓팅 시뮬레이터

> **v1** · 2026.05.24 확정
> DB: PostgreSQL (Supabase)

## 개요

- 테이블 **6개** + 리더보드용 **view 1개**
- 실제 데이터가 쌓이는 핵심 테이블은 `simulation_results` 하나
- **PK 정책**: 서버가 통제하는 시드 데이터(`teams`, `stadiums`, `sections`, `matches`)는 `int(serial)`, 유저가 만들어내는 데이터(`users`, `simulation_results`)는 `uuid`
  - `uuid`는 `?id=3` 같은 순회 공격을 막기 위해 외부 노출 식별자에 사용
- 좌석 1석 1석은 DB에 저장하지 않음 (`seats` 테이블 없음). 단일 유저 시뮬레이션이라 좌석 상태는 메모리/세션에서 처리

---

## 테이블 정의

### `users` — 익명 세션

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | |
| nickname | varchar(30) | NOT NULL | 한글 기준 최대 30자 |
| created_at | timestamp | NOT NULL | |

- 회원가입 없이 닉네임만. 진입 장벽을 낮춰 바이럴 유도 + 발표 시연 편의. password 컬럼 없음.

### `teams` — KBO 10개 팀 (시드 데이터)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | int | PK | |
| name | varchar(30) | NOT NULL | "LG 트윈스" |
| short_name | varchar(10) | NOT NULL | "LG" |
| color | varchar(7) | NOT NULL | "#C30452" (HEX) |
| home_stadium_id | int | FK → stadiums.id | 여러 팀이 같은 구장을 홈으로 쓸 수 있음 (잠실 = LG·두산) |

### `stadiums` — 구장 (MVP는 잠실만)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | int | PK | |
| name | varchar(30) | NOT NULL | |
| total_capacity | int | | |

- 구조는 확장 가능하게 두고 데이터만 잠실 1개로 시작.

### `sections` — 구역 (1루 응원석, 익사이팅존 등)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | int | PK | |
| stadium_id | int | FK → stadiums.id | |
| name | varchar(50) | NOT NULL | "1루 응원석" |
| grade | varchar(20) | NOT NULL | "VIP" / "프리미엄" / "일반" |
| price | int | NOT NULL | |
| total_seats | int | NOT NULL | |
| svg_path | text | | 좌석맵 SVG `<path d="...">` 데이터 |
| popularity | int | NOT NULL | 매진 속도 가중치 (1~10). 1루 응원석=10, 외야=3 식 |

- `svg_path`를 DB에 박아두면 **구장 추가가 row 추가만으로 끝남** → 확장성 어필 포인트
- `popularity`는 DB 개념이 아니라 게임 밸런스용 가중치

### `matches` — 가상의 경기 (시나리오)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | int | PK | |
| home_team_id | int | FK → teams.id | |
| away_team_id | int | FK → teams.id | |
| stadium_id | int | FK → teams.id | |
| match_date | timestamp | NOT NULL | |
| difficulty | varchar(10) | NOT NULL | "입문" / "실전" / "지옥" |

- 실제 KBO 경기가 아닌 가상 시나리오. 난이도를 경기 단위로 지정.
- `home_team_id`·`away_team_id`가 둘 다 `teams.id`를 참조 → JOIN 시 alias 필수.

### `simulation_results` — 시뮬레이션 결과 (핵심 테이블)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | |
| user_id | uuid | FK → users.id | |
| match_id | int | FK → matches.id | |
| section_id | int | FK → sections.id, **nullable** | 최종 획득 좌석. **NULL이면 실패** |
| total_time_ms | int | | 총 소요 시간 |
| queue_time_ms | int | | |
| seat_select_time_ms | int | | |
| captcha_time_ms | int | | |
| mistake_count | int | | 새로고침·매진 클릭 등 |
| score | int | | 종합 점수 |
| success | boolean | | |
| created_at | timestamp | | |

- 시간은 **ms 단위**로 저장 → `3240ms` vs `3180ms` 정밀 비교/정렬 가능. `int`로 최대 약 24.8일까지 표현 가능해 범위 충분.

---

## 관계 (Relationships)

| 부모 | 자식 | 관계 | 비고 |
|------|------|------|------|
| stadiums | sections | 1:N | 한 구장에 여러 구역 |
| stadiums | teams | 1:N | 여러 팀이 같은 구장을 홈으로 |
| stadiums | matches | 1:N | |
| teams | matches | 1:N | home/away 각각 참조 |
| users | simulation_results | 1:N | |
| matches | simulation_results | 1:N | |
| sections | simulation_results | 1:0..1 | 실패 시 NULL이라 엄밀히는 "0 또는 1" |

---

## 설계 포인트 (리뷰 시 짚을 것)

1. **`matches`에 FK 3개** (`home_team_id`, `away_team_id`, `stadium_id`) — 같은 `teams`를 두 번 참조하는 self-reference 유사 구조. JOIN 시 alias 분리 필요.
   ```sql
   SELECT h.name AS home_team, a.name AS away_team
   FROM matches m
   JOIN teams h ON m.home_team_id = h.id
   JOIN teams a ON m.away_team_id = a.id;
   ```
2. **`simulation_results.section_id`는 nullable** — 좌석 못 잡은 실패 케이스를 NULL로 표현. DB 만들 때 `NOT NULL` 걸지 말 것.
3. **`sections.svg_path`** — FE가 좌석맵 렌더링에 그대로 사용. 구장 추가가 row 추가로 끝남.

---

## SQL DDL (PostgreSQL)

> 위 논리 설계를 Postgres 문법으로 옮긴 것. 타입은 권장값 기준이라 팀 합의에 따라 조정 가능
> (예: `timestamp` → UTC 저장 권장이라 `timestamptz`로 둠). FK 의존성 때문에 **생성 순서 주의**.

```sql
-- 익명 세션
CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname    varchar(30) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 구장 (teams가 참조하므로 teams보다 먼저 생성)
CREATE TABLE stadiums (
  id              serial PRIMARY KEY,
  name            varchar(30) NOT NULL,
  total_capacity  integer
);

-- KBO 10개 팀 (시드)
CREATE TABLE teams (
  id              serial PRIMARY KEY,
  name            varchar(30) NOT NULL,
  short_name      varchar(10) NOT NULL,
  color           varchar(7)  NOT NULL,
  home_stadium_id integer REFERENCES stadiums(id)
);

-- 구역
CREATE TABLE sections (
  id           serial PRIMARY KEY,
  stadium_id   integer NOT NULL REFERENCES stadiums(id),
  name         varchar(50) NOT NULL,
  grade        varchar(20) NOT NULL,   -- 'VIP' | '프리미엄' | '일반' (CHECK 제약은 선택)
  price        integer NOT NULL,
  total_seats  integer NOT NULL,
  svg_path     text,
  popularity   integer NOT NULL DEFAULT 5  -- 1~10
);

-- 가상 경기
CREATE TABLE matches (
  id            serial PRIMARY KEY,
  home_team_id  integer NOT NULL REFERENCES teams(id),
  away_team_id  integer NOT NULL REFERENCES teams(id),
  stadium_id    integer NOT NULL REFERENCES stadiums(id),
  match_date    timestamptz NOT NULL,
  difficulty    varchar(10) NOT NULL   -- '입문' | '실전' | '지옥'
);

-- 시뮬레이션 결과 (핵심)
CREATE TABLE simulation_results (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id),
  match_id             integer NOT NULL REFERENCES matches(id),
  section_id           integer REFERENCES sections(id),  -- NULL이면 실패
  total_time_ms        integer,
  queue_time_ms        integer,
  seat_select_time_ms  integer,
  captcha_time_ms      integer,
  mistake_count        integer NOT NULL DEFAULT 0,
  score                integer,
  success              boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);
```

---

## 리더보드 View

> 별도 테이블 ❌. `simulation_results`에 데이터가 쌓이면 자동으로 최신화되므로 동기화 로직 불필요.
> 트래픽이 커지면 Materialized View나 Redis 캐시로 전환.

```sql
CREATE VIEW leaderboard AS
SELECT
  u.nickname,
  s.score,
  s.total_time_ms,
  s.section_id,
  RANK() OVER (ORDER BY s.score DESC) AS rank
FROM simulation_results s
JOIN users u ON s.user_id = u.id
WHERE s.success = true;
```
