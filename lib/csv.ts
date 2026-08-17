// Minimal RFC 4180 CSV writer plus a browser download.
//
// Used by the orders list so the shop's takings can go into a spreadsheet for
// the church accounts without anyone re-typing them. Twenty lines beats a
// dependency here — the only genuinely fiddly parts are quote doubling and the
// Excel leading-separator rule, both handled below.

/** Quote a cell only when it needs it, doubling any quotes inside. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  // CRLF is what Excel expects; a bare \n confuses older Windows builds.
  return lines.join("\r\n");
}

/**
 * Hand a generated CSV to the browser as a download.
 *
 * The BOM matters: without it Excel on Windows reads the file as the local
 * codepage and mangles the £ sign in every price column.
 */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
