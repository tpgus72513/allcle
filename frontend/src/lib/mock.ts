// src/lib/mock.ts — 실제 시드(잠실 9구역) 기준 mock. grade/popularity 실제값.
import type {
  Team, Match, Section, Seat, StartResult, QueueStatus, CompleteResult, SimResult,
} from "./types";

export const MOCK_TEAMS: Team[] = [
  { id: 1, name: "LG 트윈스", shortName: "LG", color: "#C30452", homeStadiumId: 1 },
  { id: 2, name: "두산 베어스", shortName: "두산", color: "#131230", homeStadiumId: 1 },
];

export const MOCK_MATCHES: Match[] = [
  { id: 101, difficulty: "실전", stadiumId: 1, homeName: "두산 베어스", awayName: "LG 트윈스", stadiumName: "잠실야구장" },
];

// 잠실 9구역 (seed.sql 그대로). popularity 1~5.
export const MOCK_SECTIONS: Section[] = [
  { id: 1, name: "프리미엄석(중앙)", grade: "VIP", price: 100000, popularity: 3, soldOut: true, area: "home" },
  { id: 2, name: "테이블석", grade: "테이블", price: 56000, popularity: 5, soldOut: false, area: "home" },
  { id: 3, name: "익사이팅존", grade: "익사이팅", price: 30000, popularity: 5, soldOut: true, area: "field" },
  { id: 4, name: "블루석", grade: "블루", price: 24000, popularity: 4, soldOut: true, area: "third" },
  { id: 5, name: "오렌지석(응원석)", grade: "응원", price: 22000, popularity: 5, soldOut: false, area: "first" },
  { id: 6, name: "레드석", grade: "레드", price: 19000, popularity: 3, soldOut: false, area: "first" },
  { id: 7, name: "네이비석", grade: "네이비", price: 16000, popularity: 3, soldOut: false, area: "third" },
  { id: 8, name: "그린응원석(외야)", grade: "외야응원", price: 11000, popularity: 4, soldOut: true, area: "outfield" },
  { id: 9, name: "그린석(외야)", grade: "외야일반", price: 10000, popularity: 2, soldOut: false, area: "outfield" },
];

export const MOCK_START: StartResult = { simId: "mock-sim-0001" };

let mockQueuePos = 5824;
export function mockQueue(): QueueStatus {
  mockQueuePos = Math.max(0, mockQueuePos - 1200);
  return { currentPosition: mockQueuePos, totalAhead: mockQueuePos, ready: mockQueuePos <= 0 };
}

export const MOCK_COMPLETE: CompleteResult = { score: 8740 };

export function getMockSeats(sectionId: number): Seat[] {
  const seats: Seat[] = [];
  let id = sectionId * 10000;
  for (let r = 1; r <= 10; r++) {
    for (let c = 1; c <= 20; c++) {
      seats.push({ id: id++, sectionId, row: r, number: c, taken: Math.random() < 0.3 });
    }
  }
  return seats;
}

export function mockResult(sectionId: number): SimResult {
  const sec = MOCK_SECTIONS.find((s) => s.id === sectionId) ?? MOCK_SECTIONS[0];
  return { score: MOCK_COMPLETE.score, rank: 23, sectionName: sec.name, grade: sec.grade, elapsedMs: 47_300 };
}
