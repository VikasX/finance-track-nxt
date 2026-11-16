import { expect, test } from "@playwright/test";
import { amortization, calculateEMI, calculateFD } from "../src/lib/finance";
import { monthRange, total } from "../src/lib/api-format";
import { parseCSV } from "../src/lib/csv";
import { ApiError, request } from "../src/lib/api-client";
test("wire decimal totals preserve precision and nullable values", () => {
  expect(total(["0.10", "0.20", null])).toBe("0.30");
  expect(total(["999999999999999.01", "0.02"])).toBe("999999999999999.03");
  expect(total(["100.00", "-25.01"])).toBe("74.99");
  expect(monthRange("2024-02").date_to).toBe("2024-02-29");
});
test("calculators handle zero interest and a non-amortizing loan", () => {
  expect(calculateEMI(120000, 0, 12).emi).toBe(10000);
  expect(calculateFD(100000, 10, 2, 1).maturity).toBeCloseTo(121000, 6);
  expect(amortization(100000, 12, 1000).months).toBe(Infinity);
  expect(amortization(100000, 12, 10000, 5000).interest).toBeLessThan(
    amortization(100000, 12, 10000).interest,
  );
});
test("API client handles 204 and validation failures", async () => {
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
test("CSV supports escaped and quoted values", () => {
  expect(
    parseCSV('name,amount\r\n"Grocery, local",200\r\n"He said ""hello""",10'),
  ).toEqual([
    ["name", "amount"],
    ["Grocery, local", "200"],
    ['He said "hello"', "10"],
  ]);
});
