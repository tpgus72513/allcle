"use client";
import type { Section } from "../lib/types";

const CX = 280, CY = 250;
const rad = (d: number) => (d * Math.PI) / 180;
const px = (r: number, a: number) => CX + r * Math.cos(rad(a));
const py = (r: number, a: number) => CY + r * Math.sin(rad(a));
const fm = (n: number) => n.toFixed(1);

function sector(r1: number, r2: number, a1: number, a2: number) {
  const lg = Math.abs(a2 - a1) > 180 ? 1 : 0;
  return [
    `M${fm(px(r1,a1))},${fm(py(r1,a1))}`,
    `A${r1},${r1},0,${lg},1,${fm(px(r1,a2))},${fm(py(r1,a2))}`,
    `L${fm(px(r2,a2))},${fm(py(r2,a2))}`,
    `A${r2},${r2},0,${lg},0,${fm(px(r2,a1))},${fm(py(r2,a1))}`,
    "Z",
  ].join(" ");
}

// section id → [r1, r2, a1, a2]  (잠실 9구역 배치)
const ARCS: Record<number, [number, number, number, number]> = {
  1: [148, 188,  72, 108],  // 프리미엄(VIP)  — 홈플레이트 바로 뒤 중앙
  2: [188, 225,  58, 122],  // 테이블석        — VIP 바로 뒤, 더 넓게
  3: [110, 148,  35, 145],  // 익사이팅        — 그라운드 가장 가까이, 넓은 호
  4: [148, 225, 122, 162],  // 블루(3루)
  5: [148, 225,  18,  58],  // 오렌지/응원(1루)
  6: [225, 280,  18,  58],  // 레드(1루) 외곽
  7: [225, 280, 122, 162],  // 네이비(3루) 외곽
  8: [145, 200, 185, 355],  // 그린응원(외야)  — 외야 전체 호
  9: [200, 235, 198, 342],  // 그린석(외야)    — 외야 그 뒤
};

function fill(popularity: number, selected: boolean, soldOut: boolean) {
  if (soldOut) return "#e5e7eb";
  if (selected) return "#dc2626";
  const a = (0.18 + (popularity / 5) * 0.55).toFixed(2);
  return `rgba(220,38,38,${a})`;
}

interface Props {
  sections: Section[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function StadiumSVG({ sections, selectedId, onSelect }: Props) {
  return (
    <svg viewBox="0 0 560 500" className="w-full max-w-xl mx-auto">
      {/* 필드 */}
      <circle cx={CX} cy={CY} r={108} fill="#16a34a" opacity="0.18" />
      <circle cx={CX} cy={CY} r={46}  fill="#16a34a" opacity="0.35" />
      <text x={CX} y={CY + 5} textAnchor="middle" fontSize="13"
        fill="#14532d" fontWeight="bold" className="pointer-events-none select-none">FIELD</text>

      {/* 홈플레이트 */}
      <polygon
        points={`${CX},${CY+90} ${CX-7},${CY+83} ${CX-7},${CY+76} ${CX+7},${CY+76} ${CX+7},${CY+83}`}
        fill="white" stroke="#9ca3af" strokeWidth="1.5"
      />

      {sections.map((sec) => {
        const def = ARCS[sec.id];
        if (!def) return null;
        const [r1, r2, a1, a2] = def;
        const d = sector(r1, r2, a1, a2);
        const isSelected = sec.id === selectedId;
        const midA = (a1 + a2) / 2;
        const midR = (r1 + r2) / 2;

        return (
          <g key={sec.id} onClick={() => !sec.soldOut && onSelect(sec.id)}>
            <path
              d={d}
              fill={fill(sec.popularity, isSelected, sec.soldOut)}
              stroke={isSelected ? "#991b1b" : "#ffffff"}
              strokeWidth={isSelected ? 2.5 : 1.5}
              opacity={sec.soldOut ? 0.6 : 1}
              className={sec.soldOut
                ? "cursor-not-allowed"
                : "cursor-pointer hover:opacity-75 transition-opacity"}
            />
            <text
              x={fm(px(midR, midA))}
              y={fm(py(midR, midA) + 4)}
              textAnchor="middle" fontSize="9" fontWeight="600"
              fill={isSelected ? "#fff" : sec.soldOut ? "#9ca3af" : "#1f2937"}
              className="pointer-events-none select-none"
            >
              {sec.grade}
            </text>
            {sec.soldOut && (
              <text
                x={fm(px(midR, midA))}
                y={fm(py(midR, midA) + 15)}
                textAnchor="middle" fontSize="8" fill="#6b7280"
                className="pointer-events-none select-none"
              >
                매진
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
