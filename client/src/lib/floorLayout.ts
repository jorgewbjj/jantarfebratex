// DON CONCEPT floor layout — 70 tables
// Coordinates are in a 1000×700 virtual canvas (main hall only)
// Based on the architectural plan: StudioCaso_DON_CONCEPT_HANIERR01NUMERADO.pdf
// Tables 10 and 44 have capacity 20; all others have capacity 10.

export interface TablePosition {
  number: number;
  x: number; // center x in virtual canvas (0–1000)
  y: number; // center y in virtual canvas (0–700)
  large?: boolean; // true for tables 10 and 44 (capacity 20)
}

// The hall is roughly 1000 wide × 680 tall in our virtual space.
// Left block: columns go right-to-left (01 is rightmost, 04 leftmost in row 1)
// Right block: columns go left-to-right (35 leftmost in row 1)
// Central area has stage/dance floor between the two blocks.

export const TABLE_POSITIONS: TablePosition[] = [
  // ── ROW 1 (top) — Left block: 04, 03, 02, 01 (left→right)
  { number: 4,  x: 148, y: 78 },
  { number: 3,  x: 218, y: 78 },
  { number: 2,  x: 288, y: 78 },
  { number: 1,  x: 358, y: 78 },

  // ── ROW 1 — Right block: 35, 36, 37
  { number: 35, x: 614, y: 78 },
  { number: 36, x: 694, y: 78 },
  { number: 37, x: 774, y: 78 },

  // ── ROW 2 — Left block: 05, 06, 07, 08, 09
  { number: 5,  x: 148, y: 158 },
  { number: 6,  x: 218, y: 158 },
  { number: 7,  x: 288, y: 158 },
  { number: 8,  x: 358, y: 158 },
  { number: 9,  x: 428, y: 158 },

  // ── ROW 2 — Right block: 43, 42, 41, 40, 39, 38
  { number: 43, x: 544, y: 158 },
  { number: 42, x: 614, y: 158 },
  { number: 41, x: 684, y: 158 },
  { number: 40, x: 754, y: 158 },
  { number: 39, x: 824, y: 158 },
  { number: 38, x: 894, y: 158 },

  // ── ROW 3 — Left block: 14, 13, 12, 11, 10(large)
  { number: 14, x: 148, y: 238 },
  { number: 13, x: 218, y: 238 },
  { number: 12, x: 288, y: 238 },
  { number: 11, x: 358, y: 238 },
  { number: 10, x: 428, y: 238, large: true },

  // ── ROW 3 — Right block: 44(large), 45, 46, 47, 48, 49
  { number: 44, x: 544, y: 238, large: true },
  { number: 45, x: 614, y: 238 },
  { number: 46, x: 684, y: 238 },
  { number: 47, x: 754, y: 238 },
  { number: 48, x: 824, y: 238 },
  { number: 49, x: 894, y: 238 },

  // ── ROW 4 — Left block: 15, 16, 17, 18
  { number: 15, x: 148, y: 318 },
  { number: 16, x: 218, y: 318 },
  { number: 17, x: 288, y: 318 },
  { number: 18, x: 358, y: 318 },

  // ── ROW 4 — Right block: 54, 53, 52, 51, 50
  { number: 54, x: 544, y: 318 },
  { number: 53, x: 614, y: 318 },
  { number: 52, x: 684, y: 318 },
  { number: 51, x: 754, y: 318 },
  { number: 50, x: 824, y: 318 },

  // ── ROW 5 — Left block: 22, 21, 20, 19, 29
  { number: 22, x: 148, y: 398 },
  { number: 21, x: 218, y: 398 },
  { number: 20, x: 288, y: 398 },
  { number: 19, x: 358, y: 398 },
  { number: 29, x: 428, y: 398 },

  // ── ROW 5 — Right block: 65, 55, 56, 57, 58, 59
  { number: 65, x: 544, y: 398 },
  { number: 55, x: 614, y: 398 },
  { number: 56, x: 684, y: 398 },
  { number: 57, x: 754, y: 398 },
  { number: 58, x: 824, y: 398 },
  { number: 59, x: 894, y: 398 },

  // ── ROW 6 — Left block: 23(far-left col), 25, 26, 27, 28
  { number: 23, x: 78,  y: 438 },
  { number: 25, x: 218, y: 468 },
  { number: 26, x: 288, y: 468 },
  { number: 27, x: 358, y: 468 },
  { number: 28, x: 428, y: 468 },

  // ── ROW 6 — Right block: 64, 63, 62, 61, 60
  { number: 64, x: 544, y: 468 },
  { number: 63, x: 614, y: 468 },
  { number: 62, x: 684, y: 468 },
  { number: 61, x: 754, y: 468 },
  { number: 60, x: 824, y: 468 },

  // ── ROW 7 — Left block: 24(far-left), 33, 31, 32, 30
  { number: 24, x: 78,  y: 508 },
  { number: 33, x: 148, y: 548 },
  { number: 31, x: 218, y: 548 },
  { number: 32, x: 288, y: 588 },
  { number: 30, x: 358, y: 588 },

  // ── ROW 7 — Right block: 67, 66, 68, 69, 70
  { number: 67, x: 614, y: 508 },
  { number: 66, x: 544, y: 548 },
  { number: 68, x: 684, y: 548 },
  { number: 69, x: 754, y: 548 },
  { number: 70, x: 824, y: 548 },

  // ── Far-left isolated column
  { number: 34, x: 78,  y: 588 },
];

// Verify all 70 tables are present
if (TABLE_POSITIONS.length !== 70) {
  console.warn(`[FloorLayout] Expected 70 tables, got ${TABLE_POSITIONS.length}`);
}

export const LARGE_TABLE_NUMBERS = new Set([10, 44]);

export function getTableCapacity(tableNumber: number): number {
  return LARGE_TABLE_NUMBERS.has(tableNumber) ? 20 : 10;
}

// Canvas dimensions for the SVG floor map
export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 660;

// Table visual radius
export const TABLE_RADIUS_NORMAL = 28;
export const TABLE_RADIUS_LARGE = 36;
