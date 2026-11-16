import { expect, test } from "@playwright/test";
import { mockApi } from "./api-fixture";
const routes = [
  ["dashboard", "Financial Overview"],
  ["income-expenses", "Income & Expenses"],
  ["budgets", "Monthly Budgets"],
  ["loans-emi", "Loans & EMI"],
  ["stocks-investments", "Stocks & Mutual Funds"],
  ["fixed-deposits", "Fixed Deposits"],
  ["ppf-savings", "PPF & Savings"],
  ["reports-analytics", "Reports & Analytics"],
  ["calendar", "Financial Calendar"],
  ["settings", "Settings"],
];
test("all pages load API data and preserve responsive layouts", async ({
  page,
}) => {
  test.setTimeout(90000);
  await mockApi(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [route, title] of routes) {
    await page.goto(`/${route}`);
    await expect(
      page.getByRole("heading", { name: title, level: 1, exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Loading financial data")).toHaveCount(0);
    await expect(page.locator(`nav a[href="/${route}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route] of routes) {
    await page.goto(`/${route}`);
    await expect(page.getByLabel("Loading financial data")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      route,
    ).toBe(true);
  }
});
test("transaction POST, changed-only PATCH and 204 DELETE refresh affected data", async ({
  page,
}) => {
  const { writes } = await mockApi(page);
  await page.goto("/income-expenses");
  await page
    .getByRole("button", { name: "Add Transaction", exact: true })
    .last()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Description / Merchant").fill("API Contract Test");
  await dialog.getByLabel("Category", { exact: true }).selectOption("2");
  await dialog.getByLabel("Amount (₹)", { exact: true }).fill("123.45");
  await dialog.getByRole("button", { name: "Create Record" }).click();
  await expect(page.locator(".toast")).toContainText("Record created");
  expect(writes[0].body.amount).toBe("123.45");
  expect(writes[0].body.category_id).toBe(2);
  expect(writes[0].body).not.toHaveProperty("id");
  expect(writes[0].body).not.toHaveProperty("user_id");
  await page.getByLabel("Search ledger").fill("API Contract Test");
  await expect(
    page.getByRole("row").filter({ hasText: "API Contract Test" }),
  ).toHaveCount(1);
  await page.getByLabel("Edit API Contract Test", { exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Description / Merchant")
    .fill("API Contract Edited");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  expect(writes.find((w) => w.method === "PATCH")?.body).toEqual({
    description: "API Contract Edited",
  });
  await page.getByLabel("Search ledger").fill("API Contract Edited");
  await page.getByLabel("Delete API Contract Edited", { exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByText("No records match your selection."),
  ).toBeVisible();
  expect(writes.at(-1)?.method).toBe("DELETE");
  await page.goto("/dashboard");
  await expect(
    page.locator(".metric").first().locator(".metric-value"),
  ).toHaveText("₹36,500");
});
test("server pagination and filters use contract query parameters", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/income-expenses");
  await page.getByLabel("Rows per page").selectOption("20");
  const requested = page.waitForRequest(
    (r) =>
      r.url().includes("/api/transactions?") &&
      r.url().includes("transaction_type=income"),
  );
  await page.getByRole("tab", { name: "Income", exact: true }).click();
  const url = new URL((await requested).url());
  expect(url.searchParams.get("page_size")).toBe("20");
  expect(url.searchParams.get("date_from")).toBe("2024-10-01");
  expect(url.searchParams.get("date_to")).toBe("2024-10-31");
  await expect(page.locator("tbody tr")).toHaveCount(1);
});
test("loading, empty, error, retry and rejected writes remain truthful", async ({
  page,
}) => {
  await mockApi(page);
  let attempts = 0;
  await page.route("**/api/dashboard?**", async (route) => {
    attempts++;
    if (attempts === 1)
      await route.fulfill({
        status: 503,
        json: { detail: "Database unavailable" },
      });
    else await route.fallback();
  });
  await page.goto("/dashboard");
  await expect(page.locator(".api-state[role=alert]")).toContainText(
    "database is temporarily unavailable",
  );
  await expect(page.locator(".metric")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator(".metric")).toHaveCount(4);
  await page.route("**/api/transactions?**", (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 8 } }),
  );
  await page.goto("/income-expenses");
  await expect(
    page.getByText("No records match your selection."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add Transaction", exact: true })
    .last()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Description / Merchant")
    .fill("Rejected Record");
  await page
    .getByRole("dialog")
    .getByLabel("Amount (₹)", { exact: true })
    .fill("1");
  await page.route("**/api/transactions", (route) =>
    route.fulfill({
      status: 422,
      json: { detail: [{ loc: ["body", "amount"], msg: "Invalid amount" }] },
    }),
  );
  await page
    .getByRole("button", { name: "Create Record", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "amount: Invalid amount",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("PPF contribution writes update balance without duplicate account patches", async ({
  page,
}) => {
  const { writes } = await mockApi(page);
  await page.goto("/ppf-savings");
  await page
    .getByRole("button", { name: "Log Contribution", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Amount (₹)", { exact: true })
    .fill("100");
  await page
    .getByRole("button", { name: "Create Record", exact: true })
    .click();
  expect(writes[0].path).toBe("/api/ppf/1/contributions");
  expect(writes[0].body).toEqual({
    amount: "100",
    contribution_date: "2024-10-22",
    reference_code: null,
  });
  expect(
    writes.some((w) => w.method === "PATCH" && w.path === "/api/ppf/1"),
  ).toBe(false);
  await expect(
    page.locator(".metric").first().locator(".metric-value"),
  ).toHaveText("₹1,00,100");
});
test("settings PATCH stays flat and shared categories remain read-only", async ({
  page,
}) => {
  const { collections, writes } = await mockApi(page);
  collections.categories.push({
    id: 900,
    name: "Shared Test",
    type: "expense",
    user_id: null,
  });
  await page.goto("/settings");
  await expect(
    page.getByRole("button", { name: "Shared Test", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Full Legal Name", { exact: true })
    .fill("Alex API Test");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect
    .poll(() => writes.find((w) => w.path === "/api/settings")?.body)
    .toEqual({ name: "Alex API Test" });
  await expect(page.locator(".profile-text")).toContainText("Alex API Test");
  await expect(
    page.getByRole("button", { name: "Delete Financial Records", exact: true }),
  ).toBeDisabled();
});

test("deleting the last server-paginated row returns to an existing page", async ({
  page,
}) => {
  const { collections } = await mockApi(page);
  collections.transactions.push({
    ...collections.transactions[0],
    id: 700,
    description: "Last Page Row",
    amount: "1.00",
  });
  await page.goto("/income-expenses");
  await page.getByLabel("Next page", { exact: true }).click();
  await page.getByLabel("Delete Last Page Row", { exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator(".page-number")).toHaveText("1 / 1");
  await expect(page.locator("tbody tr")).toHaveCount(8);
});
