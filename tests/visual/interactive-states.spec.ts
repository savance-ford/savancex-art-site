import { test, type Browser, type Page, type TestInfo } from "@playwright/test";
import {
  REFERENCE_ORIGIN,
  SITE_ORIGIN,
  waitForStorefront,
} from "../helpers/storefront";
import { comparePages } from "../helpers/visual";

interface Viewport {
  readonly width: number;
  readonly height: number;
}

async function openPair(
  browser: Browser,
  page: Page,
  path: string,
  viewport: Viewport,
): Promise<Page> {
  await page.setViewportSize(viewport);
  const referencePage = await browser.newPage({
    colorScheme: "light",
    locale: "en-US",
    serviceWorkers: "block",
    timezoneId: "America/Chicago",
    viewport,
  });
  await Promise.all([
    page.goto(`${SITE_ORIGIN}${path}`, { waitUntil: "domcontentloaded" }),
    referencePage.goto(`${REFERENCE_ORIGIN}${path}`, {
      waitUntil: "domcontentloaded",
    }),
  ]);
  await Promise.all([
    waitForStorefront(page),
    waitForStorefront(referencePage),
  ]);
  return referencePage;
}

async function compareState(
  page: Page,
  referencePage: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  await Promise.all([
    page.waitForTimeout(400),
    referencePage.waitForTimeout(400),
  ]);
  await comparePages(page, referencePage, testInfo, {
    maxDiffPixelRatio: 0.005,
    name,
  });
  await referencePage.close();
}

test.describe("desktop interactive states", () => {
  const viewport = { width: 1440, height: 1000 } as const;

  test("fully loaded homepage", async ({ browser, page }, testInfo) => {
    const referencePage = await openPair(browser, page, "/", viewport);
    await comparePages(page, referencePage, testInfo, {
      fullPage: true,
      maxDiffPixelRatio: 0.005,
      name: "desktop-homepage-fully-loaded",
    });
    await referencePage.close();
  });

  test("header mega menu", async ({ browser, page }, testInfo) => {
    const referencePage = await openPair(browser, page, "/", viewport);
    await Promise.all([
      page.locator('[data-action="toggle-mega"]').click(),
      referencePage.locator('[data-action="toggle-mega"]').click(),
    ]);
    await compareState(page, referencePage, testInfo, "desktop-mega-menu");
  });

  test("cart drawer", async ({ browser, page }, testInfo) => {
    const referencePage = await openPair(browser, page, "/", viewport);
    const cart = JSON.stringify([
      { productId: "signal-loss", color: "Black", size: "M", qty: 1 },
    ]);
    await Promise.all([
      page.evaluate(
        ({ key, value }) => localStorage.setItem(key, value),
        { key: "savancex-cart-v1", value: cart },
      ),
      referencePage.evaluate(
        ({ key, value }) => localStorage.setItem(key, value),
        { key: "noctra-cart", value: cart },
      ),
    ]);
    await Promise.all([page.reload(), referencePage.reload()]);
    await Promise.all([
      page.locator('[data-action="open-cart"]:visible').click(),
      referencePage.locator('[data-action="open-cart"]:visible').click(),
    ]);
    await compareState(page, referencePage, testInfo, "desktop-cart-drawer");
  });

  test("search overlay", async ({ browser, page }, testInfo) => {
    const referencePage = await openPair(browser, page, "/", viewport);
    await Promise.all([
      page.locator('[data-action="open-search"]:visible').click(),
      referencePage.locator('[data-action="open-search"]:visible').click(),
    ]);
    await Promise.all([
      page.locator(".search-overlay__form input").fill("hoodie"),
      referencePage.locator(".search-overlay__form input").fill("hoodie"),
    ]);
    await compareState(page, referencePage, testInfo, "desktop-search-overlay");
  });
});

test.describe("mobile pages and interactive states", () => {
  const viewport = { width: 390, height: 844 } as const;

  for (const [name, path] of [
    ["mobile-shop-page", "/shop"],
    ["mobile-product-page", "/products/signal-loss"],
  ] as const) {
    test(name, async ({ browser, page }, testInfo) => {
      const referencePage = await openPair(browser, page, path, viewport);
      await comparePages(page, referencePage, testInfo, {
        fullPage: true,
        maxDiffPixelRatio: name === "mobile-product-page" ? 0.01 : 0.005,
        name,
      });
      await referencePage.close();
    });
  }

  test("mobile navigation", async ({ browser, page }, testInfo) => {
    const referencePage = await openPair(browser, page, "/", viewport);
    await Promise.all([
      page.locator('[data-action="open-mobile"]').click(),
      referencePage.locator('[data-action="open-mobile"]').click(),
    ]);
    await compareState(page, referencePage, testInfo, "mobile-navigation");
  });

  test("mobile cart drawer", async ({ browser, page }, testInfo) => {
    const referencePage = await openPair(browser, page, "/", viewport);
    await Promise.all([
      page.locator('[data-action="open-cart"]:visible').click(),
      referencePage.locator('[data-action="open-cart"]:visible').click(),
    ]);
    await compareState(page, referencePage, testInfo, "mobile-cart-drawer");
  });

  test("mobile filter drawer", async ({ browser, page }, testInfo) => {
    const referencePage = await openPair(browser, page, "/shop", viewport);
    await Promise.all([
      page.locator('[data-action="open-filter"]').click(),
      referencePage.locator('[data-action="open-filter"]').click(),
    ]);
    await compareState(page, referencePage, testInfo, "mobile-filter-drawer");
  });
});
