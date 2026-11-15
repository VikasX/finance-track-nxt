import { expect, test } from "@playwright/test";

test("light and dark selection persist across navigation, reload, and tabs", async ({
  page,
  context,
}) => {
  await page.goto("/dashboard");
  await page.getByLabel("Color theme").selectOption("dark");
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
  await page.reload();
  await expect(page.getByLabel("Color theme")).toHaveValue("dark");
  const other = await context.newPage();
  await other.goto("/budgets");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Color theme").selectOption("light");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(247, 249, 251)",
  );
});

test("system mode follows OS changes and an explicit preference overrides the OS", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/dashboard");
  await expect(page.getByLabel("Color theme")).toHaveValue("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Color theme").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

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
  await page.getByRole("dialog").getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.screenshot({ path: ".local/theme-dark-settings.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Color theme").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
