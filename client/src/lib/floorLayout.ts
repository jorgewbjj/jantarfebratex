// DON CONCEPT floor layout — 70 tables
// Coordinates are in a 1100×720 virtual canvas (main hall only)
// Based on the architectural plan: StudioCaso_DON_CONCEPT_HANIERR01NUMERADO.pdf
// Tables 10 and 44 have capacity 20; all others have capacity 10.
//
// COORDINATE SYSTEM:
// The hall spans x: 55–1045, y: 40–680 in virtual canvas units.
// Column spacing: ~70px; Row spacing: ~80px
// Left block (tables 01–34): x 90–460
// Right block (tables 35–70): x 580–1010
// Central corridor (palco + pista + lounge): x 460–580

export interface TablePosition {
  number: number;
  x: number; // center x in virtual canvas
  y: number; // center y in virtual canvas
  large?: boolean; // true for tables 10 and 44 (capacity 20)
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN X positions (left block)
// ─────────────────────────────────────────────────────────────────────────────
// Col A (far-left, only 23/24/34): x = 90
// Col B (04/05/14/15/22/25/33):    x = 160
// Col C (03/06/13/16/21/26/31):    x = 230
// Col D (02/07/12/17/20/27/32):    x = 300
// Col E (01/08/11/18/19/28/30):    x = 370
// Col F (09/10/29):                x = 440
//
// COLUMN X positions (right block)
// Col G (43/44/54/65/64):          x = 600
// Col H (35/42/45/53/55/63/66/67): x = 670
// Col I (36/41/46/52/56/62/68):    x = 740
// Col J (40/47/51/57/61/69):       x = 810
// Col K (37/39/48/50/58/60/70):    x = 880
// Col L (far-right, 38/49/59):     x = 950
//
// ROW Y positions
// Row 1: y = 100
// Row 2: y = 180
// Row 3: y = 260
// Row 4: y = 340
// Row 5: y = 420
// Row 6: y = 500
// Row 7a: y = 560
// Row 7b: y = 620

export const TABLE_POSITIONS: TablePosition[] = [
  // ══════════════════════════════════════════════════════
  // LEFT BLOCK
  // ══════════════════════════════════════════════════════

  // ── ROW 1: 04, 03, 02, 01
  { number:  4, x: 160, y: 100 },
  { number:  3, x: 230, y: 100 },
  { number:  2, x: 300, y: 100 },
  { number:  1, x: 370, y: 100 },

  // ── ROW 2: 05, 06, 07, 08, 09
  { number:  5, x: 160, y: 180 },
  { number:  6, x: 230, y: 180 },
  { number:  7, x: 300, y: 180 },
  { number:  8, x: 370, y: 180 },
  { number:  9, x: 440, y: 180 },

  // ── ROW 3: 14, 13, 12, 11, 10(large)
  { number: 14, x: 160, y: 260 },
  { number: 13, x: 230, y: 260 },
  { number: 12, x: 300, y: 260 },
  { number: 11, x: 370, y: 260 },
  { number: 10, x: 440, y: 260, large: true },

  // ── ROW 4: 15, 16, 17, 18
  { number: 15, x: 160, y: 340 },
  { number: 16, x: 230, y: 340 },
  { number: 17, x: 300, y: 340 },
  { number: 18, x: 370, y: 340 },

  // ── ROW 5: 22, 21, 20, 19, 29
  { number: 22, x: 160, y: 420 },
  { number: 21, x: 230, y: 420 },
  { number: 20, x: 300, y: 420 },
  { number: 19, x: 370, y: 420 },
  { number: 29, x: 440, y: 420 },

  // ── ROW 6: 23(far-left), 25, 26, 27, 28
  { number: 23, x:  90, y: 500 },
  { number: 25, x: 230, y: 500 },
  { number: 26, x: 300, y: 500 },
  { number: 27, x: 370, y: 500 },
  { number: 28, x: 440, y: 500 },

  // ── ROW 7: 24(far-left), 33, 31, 32, 30
  { number: 24, x:  90, y: 580 },
  { number: 33, x: 160, y: 560 },
  { number: 31, x: 230, y: 560 },
  { number: 32, x: 300, y: 620 },
  { number: 30, x: 370, y: 620 },

  // ── Far-left isolated
  { number: 34, x:  90, y: 640 },

  // ══════════════════════════════════════════════════════
  // RIGHT BLOCK
  // ══════════════════════════════════════════════════════

  // ── ROW 1: 35, 36, 37
  { number: 35, x: 670, y: 100 },
  { number: 36, x: 740, y: 100 },
  { number: 37, x: 880, y: 100 },

  // ── ROW 2: 43, 42, 41, 40, 39, 38
  { number: 43, x: 600, y: 180 },
  { number: 42, x: 670, y: 180 },
  { number: 41, x: 740, y: 180 },
  { number: 40, x: 810, y: 180 },
  { number: 39, x: 880, y: 180 },
  { number: 38, x: 950, y: 180 },

  // ── ROW 3: 44(large), 45, 46, 47, 48, 49
  { number: 44, x: 600, y: 260, large: true },
  { number: 45, x: 670, y: 260 },
  { number: 46, x: 740, y: 260 },
  { number: 47, x: 810, y: 260 },
  { number: 48, x: 880, y: 260 },
  { number: 49, x: 950, y: 260 },

  // ── ROW 4: 54, 53, 52, 51, 50
  { number: 54, x: 600, y: 340 },
  { number: 53, x: 670, y: 340 },
  { number: 52, x: 740, y: 340 },
  { number: 51, x: 810, y: 340 },
  { number: 50, x: 880, y: 340 },

  // ── ROW 5: 65, 55, 56, 57, 58, 59
  { number: 65, x: 600, y: 420 },
  { number: 55, x: 670, y: 420 },
  { number: 56, x: 740, y: 420 },
  { number: 57, x: 810, y: 420 },
  { number: 58, x: 880, y: 420 },
  { number: 59, x: 950, y: 420 },

  // ── ROW 6: 64, 63, 62, 61, 60
  { number: 64, x: 600, y: 500 },
  { number: 63, x: 670, y: 500 },
  { number: 62, x: 740, y: 500 },
  { number: 61, x: 810, y: 500 },
  { number: 60, x: 880, y: 500 },

  // ── ROW 7: 67, 66, 68, 69, 70
  { number: 67, x: 670, y: 560 },
  { number: 66, x: 600, y: 600 },
  { number: 68, x: 740, y: 600 },
  { number: 69, x: 810, y: 600 },
  { number: 70, x: 880, y: 600 },
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
export const CANVAS_WIDTH = 1060;
export const CANVAS_HEIGHT = 700;

// Table visual radius — larger so company name fits
export const TABLE_RADIUS_NORMAL = 30;
export const TABLE_RADIUS_LARGE = 40;
