/*
 * tests/finance.spec.ts
 * Fast checks for decimal totals, calculator edge cases, HTTP 204/errors, and quoted CSV. These test helpers directly rather than navigating the full app.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import the existing Playwright test/assertion tools (or browser Page type). Assertions wait for UI conditions rather than assuming rendering is immediate.
import { expect, test } from "@playwright/test";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { amortization, calculateEMI, calculateFD } from "../src/lib/finance";
// Reuse decimal/date adapters. Money remains a string at the API boundary; exact totals and display/chart conversion have separate responsibilities.
import { monthRange, total } from "../src/lib/api-format";
// Use the quoted-CSV parser; the transaction importer separately validates writable columns before POSTing records.
import { parseCSV } from "../src/lib/csv";
// Reuse URL, HTTP, or error helpers instead of duplicating fetch/parsing rules in this file. Browser /api paths are forwarded by the Next proxy.
import { ApiError, request } from "../src/lib/api-client";
// Exercise the behavior named below using the existing test runner. await waits for asynchronous work; expect checks the observable outcome rather than merely calling the implementation.
test("wire decimal totals preserve precision and nullable values", () => {
  expect(total(["0.10", "0.20", null])).toBe("0.30");
  expect(total(["999999999999999.01", "0.02"])).toBe("999999999999999.03");
  expect(total(["100.00", "-25.01"])).toBe("74.99");
  expect(monthRange("2024-02").date_to).toBe("2024-02-29");
});
// Exercise the behavior named below using the existing test runner. await waits for asynchronous work; expect checks the observable outcome rather than merely calling the implementation.
test("calculators handle zero interest and a non-amortizing loan", () => {
  expect(calculateEMI(120000, 0, 12).emi).toBe(10000);
  expect(calculateFD(100000, 10, 2, 1).maturity).toBeCloseTo(121000, 6);
  expect(amortization(100000, 12, 1000).months).toBe(Infinity);
  expect(amortization(100000, 12, 10000, 5000).interest).toBeLessThan(
    amortization(100000, 12, 10000).interest,
  );
});
// Exercise the behavior named below using the existing test runner. await waits for asynchronous work; expect checks the observable outcome rather than merely calling the implementation.
test("API client handles 204 and validation failures", async () => {
  // Save the real fetch function before replacing it with controlled test responses.
  // The finally block restores it even if an assertion throws, isolating later tests.
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 204 });
    expect(
      await request("/api/transactions/1", { method: "DELETE" }),
    ).toBeUndefined();
    globalThis.fetch = async () =>
      Response.json(
        { detail: [{ loc: ["body", "amount"], msg: "Must be positive" }] },
        { status: 422 },
      );
    await expect(
      request("/api/transactions", { method: "POST" }),
    ).rejects.toThrow("amount: Must be positive");
    globalThis.fetch = async () => {
      throw new Error("network offline");
    };
    await expect(request("/api/dashboard")).rejects.toBeInstanceOf(ApiError);
  } finally {
    globalThis.fetch = original;
  }
});
// Exercise the behavior named below using the existing test runner. await waits for asynchronous work; expect checks the observable outcome rather than merely calling the implementation.
test("CSV supports escaped and quoted values", () => {
  expect(
    parseCSV('name,amount\r\n"Grocery, local",200\r\n"He said ""hello""",10'),
  ).toEqual([
    ["name", "amount"],
    ["Grocery, local", "200"],
    ['He said "hello"', "10"],
  ]);
});
