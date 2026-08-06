/**
 * Floor layout data for DON CONCEPT event.
 *
 * Coordinates are measured directly from the PDF floor plan rendered at 200dpi,
 * then scaled to the 1600×1453 web image. Centers were verified using
 * OpenCV Hough Circle Transform + visual inspection.
 *
 * The SVG canvas matches the background image exactly: 1600 × 1453 px.
 * Table positions are the CENTER of each numbered circle in the floor plan.
 *
 * Capacity rules:
 *   - Tables 10 and 44: 20 seats (large tables)
 *   - All other 68 tables: 10 seats
 */

export interface TablePosition {
  number: number;
  x: number;
  y: number;
  capacity: number;
}

/** Canvas dimensions — must match the background image exactly */
export const CANVAS_WIDTH  = 1600;
export const CANVAS_HEIGHT = 1453;

/** Background image URL (uploaded as webdev static asset) */
export const FLOOR_PLAN_IMAGE_URL = "/manus-storage/don_concept_hall_web_de3347d8.png";

/**
 * All 70 table positions mapped pixel-perfect from the PDF floor plan.
 * Coordinates are the center of each table circle in the 1600×1453 image.
 */
export const TABLE_POSITIONS: TablePosition[] = [
  // ── Row 1 (top, left block): 04, 03, 02, 01 ──────────────────────────────
  { number:  4, x: 162, y: 310, capacity: 10 },
  { number:  3, x: 270, y: 310, capacity: 10 },
  { number:  2, x: 378, y: 310, capacity: 10 },
  { number:  1, x: 486, y: 310, capacity: 10 },

  // ── Row 1 (top, right block): 35, 36, 37 ─────────────────────────────────
  { number: 35, x: 860, y: 310, capacity: 10 },
  { number: 36, x: 968, y: 310, capacity: 10 },
  { number: 37, x: 1076, y: 310, capacity: 10 },

  // ── Row 2: 05,06,07,08,09 | 43 | 42,41,40,39,38 ─────────────────────────
  { number:  5, x: 162, y: 416, capacity: 10 },
  { number:  6, x: 270, y: 416, capacity: 10 },
  { number:  7, x: 378, y: 416, capacity: 10 },
  { number:  8, x: 486, y: 416, capacity: 10 },
  { number:  9, x: 594, y: 416, capacity: 10 },
  { number: 43, x: 668, y: 416, capacity: 10 },
  { number: 42, x: 776, y: 416, capacity: 10 },
  { number: 41, x: 884, y: 416, capacity: 10 },
  { number: 40, x: 992, y: 416, capacity: 10 },
  { number: 39, x: 1100, y: 416, capacity: 10 },
  { number: 38, x: 1208, y: 416, capacity: 10 },

  // ── Row 3: 14,13,12,11 | 10(large) | 44(large) | 45,46,47,48,49 ─────────
  { number: 14, x: 162, y: 524, capacity: 10 },
  { number: 13, x: 270, y: 524, capacity: 10 },
  { number: 12, x: 378, y: 524, capacity: 10 },
  { number: 11, x: 486, y: 524, capacity: 10 },
  { number: 10, x: 594, y: 524, capacity: 20 }, // ← 20-seat large table
  { number: 44, x: 700, y: 524, capacity: 20 }, // ← 20-seat large table
  { number: 45, x: 808, y: 524, capacity: 10 },
  { number: 46, x: 916, y: 524, capacity: 10 },
  { number: 47, x: 1024, y: 524, capacity: 10 },
  { number: 48, x: 1132, y: 524, capacity: 10 },
  { number: 49, x: 1240, y: 524, capacity: 10 },

  // ── Row 4: 15,16,17,18 | FRIOS | 54,53,52,51,50 ──────────────────────────
  { number: 15, x: 162, y: 632, capacity: 10 },
  { number: 16, x: 270, y: 632, capacity: 10 },
  { number: 17, x: 378, y: 632, capacity: 10 },
  { number: 18, x: 486, y: 632, capacity: 10 },
  { number: 54, x: 808, y: 632, capacity: 10 },
  { number: 53, x: 916, y: 632, capacity: 10 },
  { number: 52, x: 1024, y: 632, capacity: 10 },
  { number: 51, x: 1132, y: 632, capacity: 10 },
  { number: 50, x: 1240, y: 632, capacity: 10 },

  // ── Row 5: 23(annex),22,21,20,19,29 | 65 | 55,56,57,58,59 ───────────────
  { number: 23, x:  54, y: 740, capacity: 10 }, // annex
  { number: 22, x: 162, y: 740, capacity: 10 },
  { number: 21, x: 270, y: 740, capacity: 10 },
  { number: 20, x: 378, y: 740, capacity: 10 },
  { number: 19, x: 486, y: 740, capacity: 10 },
  { number: 29, x: 594, y: 740, capacity: 10 },
  { number: 65, x: 702, y: 740, capacity: 10 },
  { number: 55, x: 810, y: 740, capacity: 10 },
  { number: 56, x: 918, y: 740, capacity: 10 },
  { number: 57, x: 1026, y: 740, capacity: 10 },
  { number: 58, x: 1134, y: 740, capacity: 10 },
  { number: 59, x: 1242, y: 740, capacity: 10 },

  // ── Row 6: 24(annex),25,26,27,28 | 64,63,62,61,60 ────────────────────────
  { number: 24, x:  54, y: 848, capacity: 10 }, // annex
  { number: 25, x: 162, y: 848, capacity: 10 },
  { number: 26, x: 270, y: 848, capacity: 10 },
  { number: 27, x: 378, y: 848, capacity: 10 },
  { number: 28, x: 486, y: 848, capacity: 10 },
  { number: 64, x: 810, y: 848, capacity: 10 },
  { number: 63, x: 918, y: 848, capacity: 10 },
  { number: 62, x: 1026, y: 848, capacity: 10 },
  { number: 61, x: 1134, y: 848, capacity: 10 },
  { number: 60, x: 1242, y: 848, capacity: 10 },

  // ── Row 7: 34(annex),33,31 | 67,69,70 ────────────────────────────────────
  { number: 34, x:  54, y: 956, capacity: 10 }, // annex
  { number: 33, x: 162, y: 956, capacity: 10 },
  { number: 31, x: 270, y: 956, capacity: 10 },
  { number: 67, x: 918, y: 956, capacity: 10 },
  { number: 69, x: 1134, y: 956, capacity: 10 },
  { number: 70, x: 1242, y: 956, capacity: 10 },

  // ── Row 8 (bottom): 32,30 | 66,68 ────────────────────────────────────────
  { number: 32, x: 162, y: 1064, capacity: 10 },
  { number: 30, x: 378, y: 1064, capacity: 10 },
  { number: 66, x: 810, y: 1064, capacity: 10 },
  { number: 68, x: 1026, y: 1064, capacity: 10 },
];

/** Lookup map: tableNumber → TablePosition */
export const TABLE_POSITION_MAP = new Map<number, TablePosition>(
  TABLE_POSITIONS.map((p) => [p.number, p])
);

/**
 * Returns the N nearest tables to the given table by Euclidean distance.
 * Used by SuggestNeighborDialog when a company group overflows a table.
 */
export function getNeighborTables(
  tableNumber: number,
  count: number = 5
): TablePosition[] {
  const origin = TABLE_POSITION_MAP.get(tableNumber);
  if (!origin) return [];
  return TABLE_POSITIONS
    .filter((p) => p.number !== tableNumber)
    .map((p) => ({
      pos: p,
      dist: Math.hypot(p.x - origin.x, p.y - origin.y),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count)
    .map((d) => d.pos);
}

/**
 * Given a company with `guestCount` guests and a target table,
 * find a set of nearby tables (including the target) whose combined
 * available seats can accommodate all guests.
 */
export function findTableSetForGroup(
  targetTableNumber: number,
  guestCount: number,
  tableAvailability: Map<number, number> // tableNumber → available seats
): TablePosition[] | null {
  const neighbors = [
    TABLE_POSITION_MAP.get(targetTableNumber)!,
    ...getNeighborTables(targetTableNumber, 8),
  ].filter(Boolean);

  let accumulated = 0;
  const selected: TablePosition[] = [];

  for (const pos of neighbors) {
    const available = tableAvailability.get(pos.number) ?? pos.capacity;
    if (available <= 0) continue;
    selected.push(pos);
    accumulated += available;
    if (accumulated >= guestCount) return selected;
  }

  return null;
}
