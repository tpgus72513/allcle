// src/store/useFlowStore.ts
// ─────────────────────────────────────────────────────────────
// [월요일 합의 대상] 7단계 내내 들고 다니는 플로우 상태를 store 하나에 모음.
//   team → match → simId → seat → score
//
// ★ FE-1 / FE-2 합의 포인트 ★
//   - selectedSeat: "id만"이 아니라 이름·가격·등급까지 저장한다.
//     이유: 결과 카드(FE-2)에 좌석 "등급"을 표시해야 하므로, 결제·결과
//          페이지에서 다시 조회 안 하려고 선택 시점에 통째로 담아둠.
//   - 값을 "쓰는" 화면과 "읽는" 화면:
//       team   : 홈에서 set → 경기선택에서 read
//       match  : 경기선택 set → 시뮬시작에서 read
//       simId  : 시뮬시작 set → 좌석/결제/결과/대기열/캡차 전부 read
//       seat   : 좌석선택 set → 결제/결과 read
//       score  : 완료(complete) set → 결과 read
// ─────────────────────────────────────────────────────────────

import { create } from "zustand";
import type { Team, Match, Section } from "../lib/types";

// 결과 카드까지 쓸 수 있게 선택 좌석을 통째로 보관
export interface SelectedSeat {
  id: number;
  name: string;
  grade: Section["grade"];
  price: number;
  row: number;
  seatNumber: number;
}

interface FlowState {
  nickname: string;
  team: Team | null;
  match: Match | null;
  simId: string | null;
  selectedSeat: SelectedSeat | null;
  score: number | null;

  setNickname: (v: string) => void;
  setTeam: (t: Team) => void;
  setMatch: (m: Match) => void;
  setSimId: (id: string) => void;
  setSelectedSeat: (s: SelectedSeat) => void;
  setScore: (n: number) => void;
  reset: () => void; // 새 게임 시작 시 초기화
}

const initial = {
  nickname: "",
  team: null,
  match: null,
  simId: null,
  selectedSeat: null,
  score: null,
};

export const useFlowStore = create<FlowState>((set) => ({
  ...initial,
  setNickname: (v) => set({ nickname: v }),
  setTeam: (t) => set({ team: t }),
  setMatch: (m) => set({ match: m }),
  setSimId: (id) => set({ simId: id }),
  setSelectedSeat: (s) => set({ selectedSeat: s }),
  setScore: (n) => set({ score: n }),
  reset: () => set({ ...initial }),
}));
