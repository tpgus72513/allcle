cd allcle-- allcle 시드 데이터 — 잠실야구장 / LG·두산 기준
-- 데이터 출처: 기획팀 정리 (jamsil_seat_data_2026)
--
-- ⚠️ 주의: 이 스크립트는 시드 테이블(stadiums·teams·sections·matches)을
--   비우고 다시 채웁니다. TRUNCATE ... CASCADE 때문에 그에 연결된
--   simulation_results 행도 함께 삭제됩니다.
--   → 개발 중 DB 초기화 용도로만 사용하세요. 운영 데이터가 있으면 실행 금지.
--
-- 사용법:
--   - Supabase SQL Editor에 붙여넣고 Run, 또는
--   - psql "$DATABASE_URL" -f backend/seed.sql
--
-- 메모(가격·좌석수 신뢰도):
--   - price 는 전부 LG 일반 주중가. 두산 홈경기 가격은 일부 미확정이라 미반영.
--   - total_seats 중 익사이팅·오렌지·외야응원·외야일반은 추정값(개별 공식 수치 없음).
--   - popularity 는 기획 데이터의 1~5 스케일을 그대로 사용.

BEGIN;

TRUNCATE stadiums, teams, sections, matches RESTART IDENTITY CASCADE;

-- 1) 구장
INSERT INTO stadiums (name, total_capacity) VALUES ('잠실야구장', 25000);

-- 2) 팀 (LG·두산 모두 잠실 홈 = stadium_id 1)
INSERT INTO teams (name, short_name, color, home_stadium_id) VALUES
  ('LG 트윈스', 'LG', '#C30452', 1),
  ('두산 베어스', '두산', '#131230', 1);

-- 3) 구역 (등급 9개 / 가격 = LG 일반 주중 기준 / 좌석수 일부 추정)
INSERT INTO sections (stadium_id, name, grade, price, total_seats, popularity) VALUES
  (1, '프리미엄석(중앙)',  'VIP',      100000, 264,   3),
  (1, '테이블석',          '테이블',    56000,  502,   5),
  (1, '익사이팅존',        '익사이팅',  30000,  100,   5),   -- 좌석수 추정
  (1, '블루석',            '블루',      24000,  2373,  4),
  (1, '오렌지석(응원석)',   '응원',      22000,  800,   5),   -- 좌석수 추정
  (1, '레드석',            '레드',      19000,  6399,  3),
  (1, '네이비석',          '네이비',    16000,  10112, 3),
  (1, '그린응원석(외야)',   '외야응원',  11000,  1200,  4),   -- 좌석수 추정
  (1, '그린석(외야)',       '외야일반',  10000,  4600,  2);   -- 좌석수 추정

-- 4) 경기 (가상 시나리오 — LG 홈 vs 두산, 난이도별)
INSERT INTO matches (home_team_id, away_team_id, stadium_id, match_date, difficulty) VALUES
  (1, 2, 1, '2026-04-04 14:00:00+09', '지옥'),   -- 주말 잠실 더비
  (1, 2, 1, '2026-05-15 18:30:00+09', '실전'),   -- 평일 저녁
  (1, 2, 1, '2026-06-10 18:30:00+09', '입문');   -- 평일

COMMIT;
