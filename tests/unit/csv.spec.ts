import { test, expect } from "@playwright/test";
import { toCsv } from "../../lib/csv";

/**
 * The orders export lands in a spreadsheet for the church accounts, so the
 * quoting has to be right or one customer with a comma in their address shifts
 * every column after it. These pin the RFC 4180 rules that actually bite.
 */

test("plain values are written unquoted", () => {
  expect(toCsv(["a", "b"], [["1", "2"]])).toBe("a,b\r\n1,2");
});

test("a value containing a comma is quoted", () => {
  expect(toCsv(["name"], [["Smith, John"]])).toBe('name\r\n"Smith, John"');
});

test("quotes inside a value are doubled", () => {
  expect(toCsv(["note"], [['He said "yes"']])).toBe('note\r\n"He said ""yes"""');
});

test("newlines inside a value are quoted, not escaped away", () => {
  const csv = toCsv(["note"], [["line one\nline two"]]);
  expect(csv).toBe('note\r\n"line one\nline two"');
});

test("null and undefined become empty cells rather than the words", () => {
  expect(toCsv(["a", "b"], [[null, undefined]])).toBe("a,b\r\n,");
});

test("numbers are written bare so the spreadsheet reads them as numbers", () => {
  expect(toCsv(["total"], [[12.5]])).toBe("total\r\n12.5");
});

test("rows are separated by CRLF, which is what Excel expects", () => {
  expect(toCsv(["a"], [["1"], ["2"]])).toBe("a\r\n1\r\n2");
});

test("a header-only export is still valid", () => {
  expect(toCsv(["a", "b"], [])).toBe("a,b");
});

test("a realistic order row survives intact", () => {
  const csv = toCsv(
    ["Order number", "Customer", "Total (GBP)", "Notes"],
    [["DT-1042", "O'Brien, Síle", "24.00", 'Asked for "gift wrap", collect Sunday']],
  );
  const [header, row] = csv.split("\r\n");
  expect(header).toBe("Order number,Customer,Total (GBP),Notes");
  expect(row).toBe(
    'DT-1042,"O\'Brien, Síle",24.00,"Asked for ""gift wrap"", collect Sunday"',
  );
});
