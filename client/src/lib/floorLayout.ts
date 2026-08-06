/**
 * Floor layout data for DON CONCEPT event.
 *
 * Coordinates measured from the PDF floor plan rendered at 200dpi,
 * scaled to the 1600×1453 web image.
 *
 * Method: OpenCV Hough Circle Transform + Tesseract OCR for number centers.
 * OCR-confirmed positions are marked [OCR]; grid-derived are marked [GRID].
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
 * All 70 table positions measured pixel-perfect from the PDF floor plan.
 * Coordinates are the center of each table number in the 1600×1453 image.
 *
 * Column x-values (from OCR averages):
 *   annex=94, c1=222, c2=329, c3=443, c4=554, c5=663,
 *   c6=983(center), c7=1092, c8=1198, c9=1303, c10=1410, c11=1531
 *
 * Row y-values (from OCR averages):
 *   r1=356, r2=465, r3=570, r4=693, r5=793, r6=900, r7=1004, r8=1071
 */
export const TABLE_POSITIONS: TablePosition[] = [
  // ── Row 1 (y≈356): 04,03,02,01 | 35,36,37 ───────────────────────────────
  { number:  4, x: 238, y: 360, capacity: 10 }, // [OCR]
  { number:  3, x: 329, y: 356, capacity: 10 }, // [GRID]
  { number:  2, x: 444, y: 356, capacity: 10 }, // [OCR]
  { number:  1, x: 554, y: 356, capacity: 10 }, // [GRID] — OCR misread
  { number: 35, x: 1198, y: 363, capacity: 10 }, // [OCR]
  { number: 36, x: 1303, y: 364, capacity: 10 }, // [OCR]
  { number: 37, x: 1380, y: 345, capacity: 10 }, // [CORRECTED]

  // ── Row 2 (y≈465): 05,06,07,08,09 | 43,42,41,40,39,38 ───────────────────
  { number:  5, x: 238, y: 465, capacity: 10 }, // [OCR]
  { number:  6, x: 329, y: 465, capacity: 10 }, // [GRID]
  { number:  7, x: 443, y: 465, capacity: 10 }, // [GRID] — OCR misread
  { number:  8, x: 554, y: 465, capacity: 10 }, // [GRID]
  { number:  9, x: 671, y: 464, capacity: 10 }, // [OCR]
  { number: 43, x: 920, y: 462, capacity: 10 }, // [CORRECTED]
  { number: 42, x: 1092, y: 465, capacity: 10 }, // [GRID]
  { number: 41, x: 1205, y: 460, capacity: 10 }, // [CORRECTED]
  { number: 40, x: 1303, y: 465, capacity: 10 }, // [GRID]
  { number: 39, x: 1412, y: 469, capacity: 10 }, // [OCR]
  { number: 38, x: 1531, y: 465, capacity: 10 }, // [GRID]

  // ── Row 3 (y≈570): 14,13,12,11,10(large) | 44(large),45,46,47,48,49 ─────
  { number: 14, x: 238, y: 574, capacity: 10 }, // [OCR]
  { number: 13, x: 329, y: 570, capacity: 10 }, // [GRID]
  { number: 12, x: 442, y: 570, capacity: 10 }, // [OCR]
  { number: 11, x: 554, y: 570, capacity: 10 }, // [GRID]
  { number: 10, x: 600, y: 530, capacity: 20 }, // [CORRECTED] large table
  { number: 44, x: 900, y: 530, capacity: 20 }, // [CORRECTED] large table
  { number: 45, x: 1092, y: 570, capacity: 10 }, // [GRID]
  { number: 46, x: 1205, y: 565, capacity: 10 }, // [CORRECTED]
  { number: 47, x: 1310, y: 565, capacity: 10 }, // [CORRECTED]
  { number: 48, x: 1410, y: 570, capacity: 10 }, // [GRID]
  { number: 49, x: 1531, y: 570, capacity: 10 }, // [GRID]

  // ── Row 4 (y≈693): 15,16,17,18 | 54,53,52,51,50 ─────────────────────────
  { number: 15, x: 222, y: 693, capacity: 10 }, // [OCR]
  { number: 16, x: 329, y: 690, capacity: 10 }, // [OCR]
  { number: 17, x: 443, y: 693, capacity: 10 }, // [GRID]
  { number: 18, x: 554, y: 688, capacity: 10 }, // [OCR]
  { number: 54, x: 1092, y: 694, capacity: 10 }, // [OCR]
  { number: 53, x: 1198, y: 689, capacity: 10 }, // [OCR]
  { number: 52, x: 1303, y: 690, capacity: 10 }, // [OCR]
  { number: 51, x: 1410, y: 686, capacity: 10 }, // [OCR]
  { number: 50, x: 1520, y: 675, capacity: 10 }, // [CORRECTED]

  // ── Row 5 (y≈793): 23(annex),22,21,20,19,29 | 65 | 55,56,57,58,59 ───────
  { number: 23, x:  90, y: 780, capacity: 10 }, // [CORRECTED] annex
  { number: 22, x: 225, y: 798, capacity: 10 }, // [OCR]
  { number: 21, x: 328, y: 795, capacity: 10 }, // [OCR]
  { number: 20, x: 445, y: 794, capacity: 10 }, // [OCR]
  { number: 19, x: 554, y: 793, capacity: 10 }, // [OCR]
  { number: 29, x: 630, y: 820, capacity: 10 }, // [CORRECTED]
  { number: 65, x: 900, y: 830, capacity: 10 }, // [CORRECTED]
  { number: 55, x: 1090, y: 800, capacity: 10 }, // [OCR]
  { number: 56, x: 1197, y: 795, capacity: 10 }, // [OCR]
  { number: 57, x: 1303, y: 797, capacity: 10 }, // [OCR]
  { number: 58, x: 1410, y: 793, capacity: 10 }, // [GRID]
  { number: 59, x: 1531, y: 775, capacity: 10 }, // [OCR]

  // ── Row 6 (y≈900): 24(annex),25,26,27,28 | 64,63,62,61,60 ───────────────
  { number: 24, x:  94, y: 883, capacity: 10 }, // [OCR]
  { number: 25, x: 222, y: 900, capacity: 10 }, // [GRID]
  { number: 26, x: 331, y: 900, capacity: 10 }, // [OCR]
  { number: 27, x: 445, y: 899, capacity: 10 }, // [OCR]
  { number: 28, x: 556, y: 898, capacity: 10 }, // [OCR]
  { number: 64, x: 1092, y: 906, capacity: 10 }, // [OCR]
  { number: 63, x: 1198, y: 901, capacity: 10 }, // [OCR]
  { number: 62, x: 1303, y: 903, capacity: 10 }, // [OCR]
  { number: 61, x: 1410, y: 900, capacity: 10 }, // [GRID]
  { number: 60, x: 1520, y: 890, capacity: 10 }, // [CORRECTED]

  // ── Row 7 (y≈1004): 34(annex),33,31 | 67,69,70 ───────────────────────────
  { number: 34, x:  90, y: 990, capacity: 10 }, // [CORRECTED] annex
  { number: 33, x: 222, y: 1004, capacity: 10 }, // [GRID]
  { number: 31, x: 366, y: 1004, capacity: 10 }, // [OCR]
  { number: 67, x: 1275, y: 1004, capacity: 10 }, // [OCR]
  { number: 69, x: 1410, y: 1004, capacity: 10 }, // [GRID]
  { number: 70, x: 1520, y: 990, capacity: 10 }, // [CORRECTED]

  // ── Row 8 (y≈1071): 32,30 | 66,68 ────────────────────────────────────────
  { number: 32, x: 293, y: 1071, capacity: 10 }, // [OCR]
  { number: 30, x: 436, y: 1071, capacity: 10 }, // [OCR]
  { number: 66, x: 1208, y: 1071, capacity: 10 }, // [OCR]
  { number: 68, x: 1351, y: 1071, capacity: 10 }, // [OCR]
];

/** Lookup map: tableNumber → TablePosition */
export const TABLE_POSITION_MAP = new Map<number, TablePosition>(
  TABLE_POSITIONS.map((p) => [p.number, p])
);

/**
 * Returns the N nearest tables to the given table by Euclidean distance.
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
 * Find a set of nearby tables whose combined available seats can accommodate guestCount.
 */
export function findTableSetForGroup(
  targetTableNumber: number,
  guestCount: number,
  tableAvailability: Map<number, number>
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
