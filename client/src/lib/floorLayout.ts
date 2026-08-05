/**
 * DON CONCEPT — Floor Layout
 *
 * Coordinates derived from pixel measurements on the 300 DPI PDF render
 * (StudioCaso_DON_CONCEPT_HANIERR01NUMERADO.pdf, scale 1:100).
 *
 * Canvas: 1600 × 920 virtual units
 *
 * The hall occupies x: 110–1490, y: 60–860.
 * Left annex (tables 23, 24, 34): x: 60–110, y: 440–860.
 * Right curved wall (tables 38, 49, 59, 70): x: 1490–1560.
 *
 * Column X centres (measured from PDF):
 *   Left block:
 *     xA = 135   (23, 24, 34 — left annex)
 *     xB = 205   (04, 05, 14, 15, 22, 25, 33)
 *     xC = 285   (03, 06, 13, 16, 21, 26, 31)
 *     xD = 365   (02, 07, 12, 17, 20, 27, 32)
 *     xE = 445   (01, 08, 11, 18, 19, 28, 30)
 *     xF = 525   (09, 10, 29)
 *
 *   Central gap: x 525–755 (PALCO, LOUNGE sofas, FRIOS)
 *
 *   Right block:
 *     xG = 755   (43, 44, 54, 65, 64, 66)
 *     xH = 835   (35, 42, 45, 53, 55, 63, 67)
 *     xI = 915   (36, 41, 46, 52, 56, 62, 68)
 *     xJ = 995   (40, 47, 51, 57, 61, 69)
 *     xK = 1075  (37, 39, 48, 50, 58, 60, 70)
 *     xL = 1155  (38, 49, 59)
 *
 * Row Y centres (measured from PDF):
 *   y1 = 155   (row 1: 04, 03, 02, 01, 35, 36, 37)
 *   y2 = 245   (row 2: 05, 06, 07, 08, 09, 43, 42, 41, 40, 39, 38)
 *   y3 = 335   (row 3: 14, 13, 12, 11, 10, 44, 45, 46, 47, 48, 49)
 *   y4 = 425   (row 4: 15, 16, 17, 18, 54, 53, 52, 51, 50)
 *   y5 = 515   (row 5: 23, 22, 21, 20, 19, 29, 65, 55, 56, 57, 58, 59)
 *   y6 = 605   (row 6: 24, 25, 26, 27, 28, 64, 63, 62, 61, 60)
 *   y7 = 695   (row 7: 34, 33, 31, 67, 69, 70)
 *   y8 = 785   (row 8: 32, 30, 66, 68)
 */

export interface TablePosition {
  number: number;
  x: number;
  y: number;
  large?: boolean; // capacity 20 (tables 10 and 44)
}

// ─── Column X values ──────────────────────────────────────────────────────────
// Left block: 5 columns + 1 for tables 09/10/29
// Column spacing = 82px → total left block width = 4×82 = 328px
// Right block mirrors left block
// Central gap (PALCO + lounge area): x 530–790
const xA = 130;  // left annex (tables 23, 24, 34)
const xB = 200;
const xC = 282;
const xD = 364;
const xE = 446;
const xF = 528;  // tables 09, 10, 29 — rightmost left column

const xG = 792;  // tables 43, 44, 54, 65, 64, 66 — leftmost right column
const xH = 874;
const xI = 956;
const xJ = 1038;
const xK = 1120;
const xL = 1202; // rightmost (38, 49, 59)

// ─── Row Y values ─────────────────────────────────────────────────────────────
// Row spacing = 88px → 7 rows × 88 = 616px, starting at y=148
const y1 = 148;
const y2 = 236;
const y3 = 324;
const y4 = 412;
const y5 = 500;
const y6 = 588;
const y7 = 676;
const y8 = 764;

export const TABLE_POSITIONS: TablePosition[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // LEFT BLOCK
  // ══════════════════════════════════════════════════════════════════════════

  // Row 1 — 04, 03, 02, 01
  { number:  4, x: xB, y: y1 },
  { number:  3, x: xC, y: y1 },
  { number:  2, x: xD, y: y1 },
  { number:  1, x: xE, y: y1 },

  // Row 2 — 05, 06, 07, 08, 09
  { number:  5, x: xB, y: y2 },
  { number:  6, x: xC, y: y2 },
  { number:  7, x: xD, y: y2 },
  { number:  8, x: xE, y: y2 },
  { number:  9, x: xF, y: y2 },

  // Row 3 — 14, 13, 12, 11, 10(large)
  { number: 14, x: xB, y: y3 },
  { number: 13, x: xC, y: y3 },
  { number: 12, x: xD, y: y3 },
  { number: 11, x: xE, y: y3 },
  { number: 10, x: xF, y: y3, large: true },

  // Row 4 — 15, 16, 17, 18
  { number: 15, x: xB, y: y4 },
  { number: 16, x: xC, y: y4 },
  { number: 17, x: xD, y: y4 },
  { number: 18, x: xE, y: y4 },

  // Row 5 — 23(annex), 22, 21, 20, 19, 29
  { number: 23, x: xA, y: y5 },
  { number: 22, x: xB, y: y5 },
  { number: 21, x: xC, y: y5 },
  { number: 20, x: xD, y: y5 },
  { number: 19, x: xE, y: y5 },
  { number: 29, x: xF, y: y5 },

  // Row 6 — 24(annex), 25, 26, 27, 28
  { number: 24, x: xA, y: y6 },
  { number: 25, x: xB, y: y6 },
  { number: 26, x: xC, y: y6 },
  { number: 27, x: xD, y: y6 },
  { number: 28, x: xE, y: y6 },

  // Row 7 — 34(annex), 33, 31
  { number: 34, x: xA, y: y7 },
  { number: 33, x: xB, y: y7 },
  { number: 31, x: xC, y: y7 },

  // Row 8 — 32, 30
  { number: 32, x: xD, y: y8 },
  { number: 30, x: xE, y: y8 },

  // ══════════════════════════════════════════════════════════════════════════
  // RIGHT BLOCK
  // ══════════════════════════════════════════════════════════════════════════

  // Row 1 — 35, 36, 37
  { number: 35, x: xH, y: y1 },
  { number: 36, x: xI, y: y1 },
  { number: 37, x: xK, y: y1 },

  // Row 2 — 43, 42, 41, 40, 39, 38
  { number: 43, x: xG, y: y2 },
  { number: 42, x: xH, y: y2 },
  { number: 41, x: xI, y: y2 },
  { number: 40, x: xJ, y: y2 },
  { number: 39, x: xK, y: y2 },
  { number: 38, x: xL, y: y2 },

  // Row 3 — 44(large), 45, 46, 47, 48, 49
  { number: 44, x: xG, y: y3, large: true },
  { number: 45, x: xH, y: y3 },
  { number: 46, x: xI, y: y3 },
  { number: 47, x: xJ, y: y3 },
  { number: 48, x: xK, y: y3 },
  { number: 49, x: xL, y: y3 },

  // Row 4 — 54, 53, 52, 51, 50
  { number: 54, x: xG, y: y4 },
  { number: 53, x: xH, y: y4 },
  { number: 52, x: xI, y: y4 },
  { number: 51, x: xJ, y: y4 },
  { number: 50, x: xK, y: y4 },

  // Row 5 — 65, 55, 56, 57, 58, 59
  { number: 65, x: xG, y: y5 },
  { number: 55, x: xH, y: y5 },
  { number: 56, x: xI, y: y5 },
  { number: 57, x: xJ, y: y5 },
  { number: 58, x: xK, y: y5 },
  { number: 59, x: xL, y: y5 },

  // Row 6 — 64, 63, 62, 61, 60
  { number: 64, x: xG, y: y6 },
  { number: 63, x: xH, y: y6 },
  { number: 62, x: xI, y: y6 },
  { number: 61, x: xJ, y: y6 },
  { number: 60, x: xK, y: y6 },

  // Row 7 — 67, 69, 70
  { number: 67, x: xH, y: y7 },
  { number: 69, x: xJ, y: y7 },
  { number: 70, x: xK, y: y7 },

  // Row 8 — 66, 68
  { number: 66, x: xG, y: y8 },
  { number: 68, x: xI, y: y8 },
];

// Sanity check
if (TABLE_POSITIONS.length !== 70) {
  console.warn(`[FloorLayout] Expected 70 tables, got ${TABLE_POSITIONS.length}`);
}

export const LARGE_TABLE_NUMBERS = new Set([10, 44]);

export function getTableCapacity(tableNumber: number): number {
  return LARGE_TABLE_NUMBERS.has(tableNumber) ? 20 : 10;
}

// ─── Canvas & visual constants ────────────────────────────────────────────────
export const CANVAS_WIDTH  = 1360;
export const CANVAS_HEIGHT = 900;

// Normal table (capacity 10): table radius + chair orbit + chair radius = 22 + 32 + 5 = 59 → ~118px diameter
// Large table  (capacity 20): table radius + chair orbit + chair radius = 32 + 46 + 6 = 84 → ~168px diameter
// Column spacing = 85px → leaves ~85 - 59 = 26px gap between table edges (matches PDF)

export const TABLE_RADIUS_NORMAL = 22;
export const TABLE_RADIUS_LARGE  = 32;

export const CHAIR_RADIUS_NORMAL = 5;
export const CHAIR_RADIUS_LARGE  = 6;

export const CHAIR_ORBIT_NORMAL  = 32;  // centre-to-chair-centre distance
export const CHAIR_ORBIT_LARGE   = 46;

export const CHAIR_COUNT_NORMAL  = 10;
export const CHAIR_COUNT_LARGE   = 16;  // visual only; capacity is 20

// ─── Neighbour / suggestion helpers ──────────────────────────────────────────
export function getNeighborTables(
  targetNumber: number,
  allTables: Array<{ id: number; tableNumber: number; capacity: number; companyName?: string | null }>,
  guestCounts: Map<number, number>,
  minAvailable = 1,
  maxResults = 6
): Array<{ tableNumber: number; tableId: number; available: number; capacity: number; companyName: string | null; distance: number }> {
  const targetPos = TABLE_POSITIONS.find((p) => p.number === targetNumber);
  if (!targetPos) return [];

  return allTables
    .filter((t) => t.tableNumber !== targetNumber)
    .map((t) => {
      const pos = TABLE_POSITIONS.find((p) => p.number === t.tableNumber);
      if (!pos) return null;
      const seated    = guestCounts.get(t.id) ?? 0;
      const available = t.capacity - seated;
      const distance  = Math.hypot(pos.x - targetPos.x, pos.y - targetPos.y);
      return { tableNumber: t.tableNumber, tableId: t.id, available, capacity: t.capacity, companyName: t.companyName ?? null, distance };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null && t.available >= minAvailable)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults);
}

export function findTableSetForGroup(
  targetNumber: number,
  guestCount: number,
  allTables: Array<{ id: number; tableNumber: number; capacity: number; companyName?: string | null }>,
  guestCounts: Map<number, number>
): Array<{ tableNumber: number; tableId: number; available: number; capacity: number; companyName: string | null; distance: number }> | null {
  const targetPos = TABLE_POSITIONS.find((p) => p.number === targetNumber);
  if (!targetPos) return null;

  const candidates = allTables
    .map((t) => {
      const pos = TABLE_POSITIONS.find((p) => p.number === t.tableNumber);
      if (!pos) return null;
      const seated    = guestCounts.get(t.id) ?? 0;
      const available = t.capacity - seated;
      const distance  = t.tableNumber === targetNumber ? 0 : Math.hypot(pos.x - targetPos.x, pos.y - targetPos.y);
      return { tableNumber: t.tableNumber, tableId: t.id, available, capacity: t.capacity, companyName: t.companyName ?? null, distance };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null && t.available > 0)
    .sort((a, b) => a.distance - b.distance);

  let total = 0;
  const selected: typeof candidates = [];
  for (const c of candidates) {
    selected.push(c);
    total += c.available;
    if (total >= guestCount) return selected;
  }
  return null;
}
