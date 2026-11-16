/*
 * src/lib/csv.ts
 * Reads quoted CSV text for the transaction importer. It handles escaped quotes and line breaks before the page validates fields and submits individual API writes.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
/** Parse CSV including quoted commas, escaped quotes, BOMs, and embedded newlines. */
// Walk characters while tracking quoted fields. Commas/newlines split cells/rows only outside quotes; doubled quotes represent one literal quote.
export function parseCSV(text: string): string[][] {
  // Accumulate parsed rows as arrays of cell text; the first row is usually headers.
  // Parsing describes the file structure only, before the importer validates fields.
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  return rows;
}
