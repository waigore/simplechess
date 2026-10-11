export interface MoveRow {
  number: number;
  white: string;
  black: string | null;
}

/** Groups half-moves (SAN, White first) into numbered full-move rows. */
export function moveRows(sans: readonly string[]): MoveRow[] {
  const rows: MoveRow[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: sans[i]!, black: sans[i + 1] ?? null });
  }
  return rows;
}
