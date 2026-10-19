import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";

const fixture = fileURLToPath(
  new URL("./fixtures/outline.pdf", import.meta.url),
);

async function openFixture(page: Page) {
  await page.goto("/");
  const chooserPromise = page.waitForEvent("filechooser");
  await page.locator(".primary-button").first().click();
  const chooser = await chooserPromise;
  await chooser.setFiles(fixture);
  await page.waitForSelector(".page-canvas", { timeout: 30_000 });
  await expect(page.locator(".outline-row")).toHaveCount(6);
}

async function gotoPage(page: Page, target: number) {
  await page.locator(".page-input").fill(String(target));
  await page.locator(".page-input").press("Enter");
  await expect(page.locator(".page-input")).toHaveValue(String(target));
}

test.describe("Paper reader", () => {
  test("highlights exactly one outline entry when several share a page", async ({
    page,
  }) => {
    await openFixture(page);

    // Page 1 is before the first outline entry.
    await expect(page.locator(".outline-row.is-active")).toHaveCount(0);

    await gotoPage(page, 2);
    await expect(page.locator(".outline-row.is-active")).toHaveCount(1);
    await expect(
      page.locator(".outline-row.is-active .outline-title"),
    ).toHaveText("Section 1");

    // Clicking a nested entry keeps only that entry selected.
    const beta = page.locator(".outline-row", { hasText: "1.2 Beta" }).first();
    await beta.locator(".outline-link").click();
    await expect(page.locator(".outline-row.is-active")).toHaveCount(1);
    await expect(
      page.locator(".outline-row.is-active .outline-title"),
    ).toHaveText("1.2 Beta");

    // Navigating away updates the active entry, still only one.
    await gotoPage(page, 3);
    await expect(page.locator(".outline-row.is-active")).toHaveCount(1);
    await expect(
      page.locator(".outline-row.is-active .outline-title"),
    ).toHaveText("Section 2");
  });

  test("searches the document and highlights hits", async ({ page }) => {
    await openFixture(page);
    await page.locator('[aria-label="搜索"], [aria-label="Search"]').first().click();
    await expect(page.locator(".search-input")).toBeVisible();

    await page.locator(".search-input").fill("alpha");
    await expect(page.locator(".search-result").first()).toBeVisible();
    await expect(page.locator(".search-hit-rect").first()).toBeVisible();

    const resultCount = await page.locator(".search-result").count();
    expect(resultCount).toBeGreaterThan(1);
  });

  test("switches the interface language", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-settings-trigger]").click();
    await page.getByRole("button", { name: "English" }).click();

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".open-button")).toContainText("Open");
    await expect(page.locator(".settings-popover")).toContainText("Settings");
  });
});
