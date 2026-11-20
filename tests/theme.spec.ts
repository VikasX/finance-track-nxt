/*
 * tests/theme.spec.ts
 * Browser checks for saved appearance, OS theme changes, tab synchronization, and dark-mode dialogs/charts/mobile navigation using isolated API fixtures.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import the existing Playwright test/assertion tools (or browser Page type). Assertions wait for UI conditions rather than assuming rendering is immediate.
import { expect, test } from "@playwright/test";
// Use isolated contract-shaped fixtures for tests; these records never replace real API data in the running application.
import { mockApi } from "./api-fixture";
// Install a fresh isolated API interceptor before each case. Appearance behavior is tested without depending on the deployed database or mutating it.
test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

// Exercise the behavior named below using the existing test runner. await waits for asynchronous work; expect checks the observable outcome rather than merely calling the implementation.
test("light and dark selection persist across navigation, reload, and tabs", async ({
  page,
  context,
}) => {
  await page.goto("/dashboard");
  await page
    .getByRole("banner")
    .getByRole("group", { name: "Color theme", exact: true })
    .getByRole("button", { name: "Dark theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(14, 17, 26)",
  );
  await page
    .locator("nav")
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // Settings and the header share the same saved preference.
  const settingsTheme = page.getByRole("group", { name: "Settings color theme", exact: true });
  await expect(settingsTheme.getByRole("button", { name: "Dark theme", exact: true })).toHaveAttribute("aria-pressed", "true");
  await settingsTheme.getByRole("button", { name: "Light theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  // Native toggle buttons can also be activated with the keyboard.
  await settingsTheme.getByRole("button", { name: "Dark theme", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(
    page.getByRole("banner").getByRole("button", { name: "Dark theme", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const other = await context.newPage();
  await other.goto("/budgets");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("banner")
    .getByRole("group", { name: "Color theme", exact: true })
    .getByRole("button", { name: "Light theme", exact: true })
    .click();
  await expect(other.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(247, 249, 251)",
  );
});

// Exercise the behavior named below using the existing test runner. await waits for asynchronous work; expect checks the observable outcome rather than merely calling the implementation.
test("system mode follows OS changes and an explicit preference overrides the OS", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("banner").getByRole("button", { name: "System theme", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("banner")
    .getByRole("group", { name: "Color theme", exact: true })
    .getByRole("button", { name: "Dark theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("banner").getByRole("button", { name: "System theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

// Exercise the behavior named below using the existing test runner. await waits for asynchronous work; expect checks the observable outcome rather than merely calling the implementation.
test("all pages, dialogs, charts and mobile navigation support dark mode", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("fintrack-theme", "dark"),
  );
  for (const route of [
    "dashboard",
    "income-expenses",
    "budgets",
    "loans-emi",
    "stocks-investments",
    "fixed-deposits",
    "ppf-savings",
    "reports-analytics",
    "calendar",
    "settings",
  ]) {
    await page.goto(`/${route}`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".card,.table-card").first()).toHaveCSS(
      "background-color",
      "rgb(23, 28, 41)",
    );
  }
  await page
    .getByRole("button", { name: "Add Transaction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCSS(
    "background-color",
    "rgb(23, 28, 41)",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await page.screenshot({
    path: ".local/theme-dark-settings.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("banner")
    .getByRole("group", { name: "Color theme", exact: true })
    .getByRole("button", { name: "Light theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".local/theme-toggle-mobile.png" });
  expect(errors).toEqual([]);
});
