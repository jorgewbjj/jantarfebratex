// DON CONCEPT floor layout — 70 tables
// Pixel-perfect recreation of StudioCaso_DON_CONCEPT_HANIERR01NUMERADO.pdf
//
// Canvas: 1060 × 680 virtual units (main hall only)
// Tables 10 and 44 have capacity 20; all others have capacity 10.
//
// COORDINATE SYSTEM (derived from PDF 1:100 scale plan, verified against
// the numbered screenshot provided by the user):
//
// The hall is divided into two blocks separated by the central dance-floor
// / lounge area (roughly x 430–630).
//
// LEFT BLOCK columns (x):
//   Col A (23,24,34):              x =  95
//   Col B (04,05,14,15,22,25,33):  x = 155
//   Col C (03,06,13,16,21,26,31):  x = 215
//   Col D (02,07,12,17,20,27,32):  x = 275
//   Col E (01,08,11,18,19,28,30):  x = 335
//   Col F (09,10,29):              x = 395
//
// RIGHT BLOCK columns (x):
//   Col G (43,44,54,65,64,66):     x = 615
//   Col H (35,42,45,53,55,63,67):  x = 675
//   Col I (36,41,46,52,56,62,68):  x = 735
//   Col J (40,47,51,57,61,69):     x = 795
//   Col K (37,39,48,50,58,60,70):  x = 855
//   Col L (38,49,59):              x = 915
//
// ROW Y positions:
//   Row 1: y = 115
//   Row 2: y = 185
//   Row 3: y = 255
//   Row 4: y = 325
//   Row 5: y = 395
//   Row 6: y = 460
//   Row 7: y = 520
//   Row 8: y = 580

export interface TablePosition {
  number: number;
  x: number; // center x in virtual canvas
  y: number; // center y in virtual canvas
  large?: boolean; // true for tables 10 and 44 (capacity 20)
}

export const TABLE_POSITIONS: TablePosition[] = [
  // ══════════════════════════════════════════════════════
  // LEFT BLOCK
  // ══════════════════════════════════════════════════════

  // ── ROW 1 (y=115): 04, 03, 02, 01
  { number:  4, x: 155, y: 115 },
  { number:  3, x: 215, y: 115 },
  { number:  2, x: 275, y: 115 },
  { number:  1, x: 335, y: 115 },

  // ── ROW 2 (y=185): 05, 06, 07, 08, 09
  { number:  5, x: 155, y: 185 },
  { number:  6, x: 215, y: 185 },
  { number:  7, x: 275, y: 185 },
  { number:  8, x: 335, y: 185 },
  { number:  9, x: 395, y: 185 },

  // ── ROW 3 (y=255): 14, 13, 12, 11, 10(large)
  { number: 14, x: 155, y: 255 },
  { number: 13, x: 215, y: 255 },
  { number: 12, x: 275, y: 255 },
  { number: 11, x: 335, y: 255 },
  { number: 10, x: 395, y: 255, large: true },

  // ── ROW 4 (y=325): 15, 16, 17, 18
  { number: 15, x: 155, y: 325 },
  { number: 16, x: 215, y: 325 },
  { number: 17, x: 275, y: 325 },
  { number: 18, x: 335, y: 325 },

  // ── ROW 5 (y=395): 22, 21, 20, 19, 29
  { number: 22, x: 155, y: 395 },
  { number: 21, x: 215, y: 395 },
  { number: 20, x: 275, y: 395 },
  { number: 19, x: 335, y: 395 },
  { number: 29, x: 395, y: 395 },

  // ── ROW 6 (y=460): 23(far-left), 25, 26, 27, 28
  { number: 23, x:  95, y: 460 },
  { number: 25, x: 215, y: 460 },
  { number: 26, x: 275, y: 460 },
  { number: 27, x: 335, y: 460 },
  { number: 28, x: 395, y: 460 },

  // ── ROW 7 (y=520): 24(far-left), 33, 31
  { number: 24, x:  95, y: 520 },
  { number: 33, x: 155, y: 520 },
  { number: 31, x: 215, y: 520 },

  // ── ROW 8 (y=580): 34(far-left), 32, 30
  { number: 34, x:  95, y: 580 },
  { number: 32, x: 275, y: 580 },
  { number: 30, x: 335, y: 580 },

  // ══════════════════════════════════════════════════════
  // RIGHT BLOCK
  // ══════════════════════════════════════════════════════

  // ── ROW 1 (y=115): 35, 36, (gap), 37
  { number: 35, x: 675, y: 115 },
  { number: 36, x: 735, y: 115 },
  { number: 37, x: 855, y: 115 },

  // ── ROW 2 (y=185): 43, 42, 41, 40, 39, 38
  { number: 43, x: 615, y: 185 },
  { number: 42, x: 675, y: 185 },
  { number: 41, x: 735, y: 185 },
  { number: 40, x: 795, y: 185 },
  { number: 39, x: 855, y: 185 },
  { number: 38, x: 915, y: 185 },

  // ── ROW 3 (y=255): 44(large), 45, 46, 47, 48, 49
  { number: 44, x: 615, y: 255, large: true },
  { number: 45, x: 675, y: 255 },
  { number: 46, x: 735, y: 255 },
  { number: 47, x: 795, y: 255 },
  { number: 48, x: 855, y: 255 },
  { number: 49, x: 915, y: 255 },

  // ── ROW 4 (y=325): 54, 53, 52, 51, 50
  { number: 54, x: 615, y: 325 },
  { number: 53, x: 675, y: 325 },
  { number: 52, x: 735, y: 325 },
  { number: 51, x: 795, y: 325 },
  { number: 50, x: 855, y: 325 },

  // ── ROW 5 (y=395): 65, 55, 56, 57, 58, 59
  { number: 65, x: 615, y: 395 },
  { number: 55, x: 675, y: 395 },
  { number: 56, x: 735, y: 395 },
  { number: 57, x: 795, y: 395 },
  { number: 58, x: 855, y: 395 },
  { number: 59, x: 915, y: 395 },

  // ── ROW 6 (y=460): 64, 63, 62, 61, 60
  { number: 64, x: 615, y: 460 },
  { number: 63, x: 675, y: 460 },
  { number: 62, x: 735, y: 460 },
  { number: 61, x: 795, y: 460 },
  { number: 60, x: 855, y: 460 },

  // ── ROW 7 (y=520): 67, (gap), 69, 70
  { number: 67, x: 675, y: 520 },
  { number: 69, x: 795, y: 520 },
  { number: 70, x: 855, y: 520 },

  // ── ROW 8 (y=580): 66, 68
  { number: 66, x: 615, y: 580 },
  { number: 68, x: 735, y: 580 },
];

// Verify all 70 tables are present
if (TABLE_POSITIONS.length !== 70) {
  console.warn(`[FloorLayout] Expected 70 tables, got ${TABLE_POSITIONS.length}`);
}

export const LARGE_TABLE_NUMBERS = new Set([10, 44]);

export function getTableCapacity(tableNumber: number): number {
  return LARGE_TABLE_NUMBERS.has(tableNumber) ? 20 : 10;
}

/**
 * Returns tables sorted by proximity to a given table number.
 */
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
      const seated = guestCounts.get(t.id) ?? 0;
      const available = t.capacity - seated;
      const dx = pos.x - targetPos.x;
      const dy = pos.y - targetPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return { tableNumber: t.tableNumber, tableId: t.id, available, capacity: t.capacity, companyName: t.companyName ?? null, distance };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null && t.available >= minAvailable)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults);
}

/**
 * Finds the smallest set of nearby tables (starting from target) that together
 * have enough free seats for the entire group.
 */
export function findTableSetForGroup(
  targetNumber: number,
  guestCount: number,
  allTables: Array<{ id: number; tableNumber: number; capacity: number; companyName?: string | null }>,
  guestCounts: Map<number, number>
): Array<{ tableNumber: number; tableId: number; available: number; capacity: number; companyName: string | null; distance: number }> | null {
  const targetTable = allTables.find((t) => t.tableNumber === targetNumber);
  if (!targetTable) return null;

  const targetPos = TABLE_POSITIONS.find((p) => p.number === targetNumber)!;
  const candidates = allTables
    .map((t) => {
      const pos = TABLE_POSITIONS.find((p) => p.number === t.tableNumber);
      if (!pos) return null;
      const seated = guestCounts.get(t.id) ?? 0;
      const available = t.capacity - seated;
      const dx = pos.x - targetPos.x;
      const dy = pos.y - targetPos.y;
      const distance = t.tableNumber === targetNumber ? 0 : Math.sqrt(dx * dx + dy * dy);
      return { tableNumber: t.tableNumber, tableId: t.id, available, capacity: t.capacity, companyName: t.companyName ?? null, distance };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null && t.available > 0)
    .sort((a, b) => a.distance - b.distance);

  let totalAvailable = 0;
  const selected: typeof candidates = [];
  for (const candidate of candidates) {
    selected.push(candidate);
    totalAvailable += candidate.available;
    if (totalAvailable >= guestCount) return selected;
  }
  return null;
}

// Canvas dimensions for the SVG floor map
export const CANVAS_WIDTH = 1060;
export const CANVAS_HEIGHT = 680;

// Table visual radii
export const TABLE_RADIUS_NORMAL = 28;
export const TABLE_RADIUS_LARGE  = 40;

// Chair geometry
export const CHAIR_RADIUS_NORMAL = 5;
export const CHAIR_RADIUS_LARGE  = 6;
export const CHAIR_ORBIT_NORMAL  = 38;  // distance from table centre to chair centre
export const CHAIR_ORBIT_LARGE   = 54;
export const CHAIR_COUNT_NORMAL  = 10;
export const CHAIR_COUNT_LARGE   = 16;  // visual only (capacity is 20)
