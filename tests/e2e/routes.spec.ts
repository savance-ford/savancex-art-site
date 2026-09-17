import { expect, test, type Page } from "@playwright/test";
import { gotoStorefront } from "../helpers/storefront";

const staticRoutes = [
  "/",
  "/shop",
  "/shop/t-shirts",
  "/shop/hoodies",
  "/shop/crewnecks",
  "/search",
  "/cart",
  "/checkout",
  "/checkout/success",
  "/reviews",
  "/about",
  "/contact",
  "/track-order",
  "/size-guide",
  "/wash-guide",
  "/shipping",
  "/account",
] as const;

async function getPublicRoutes(page: Page): Promise<readonly string[]> {
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  const dynamicRoutes = Array.from(
    sitemap.matchAll(
      /<loc>https:\/\/savancex\.art(\/(?:collections|products)\/[^<]+)<\/loc>/g,
    ),
    (match) => match[1],
  );

  return [...staticRoutes, ...dynamicRoutes];
}

function monitorBrowser(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "image") {
      errors.push(
        `image request failed: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
      );
    }
  });
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "image" &&
      response.status() >= 400
    ) {
      errors.push(`image response ${response.status()}: ${response.url()}`);
    }
  });

  return () => expect(errors, "browser console and image loading errors").toEqual([]);
}

test("every public route renders and survives a direct refresh", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const assertNoBrowserErrors = monitorBrowser(page);
  const publicRoutes = await getPublicRoutes(page);

  for (const route of publicRoutes) {
    await test.step(route, async () => {
      await gotoStorefront(page, route);
      const response = await page.reload({ waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route} refresh status`).toBeLessThan(400);
      await expect(page.locator("body")).not.toContainText("Signal lost.");
      await expect(page.locator("body")).not.toContainText("Signal interrupted.");
    });
  }

  assertNoBrowserErrors();
});

test("rendered internal links resolve to storefront pages", async ({ page }) => {
  test.setTimeout(90_000);
  const discoveredLinks = new Set<string>();

  for (const route of staticRoutes) {
    await gotoStorefront(page, route);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")).filter(Boolean),
    );
    for (const href of hrefs) discoveredLinks.add(href as string);
  }

  for (const href of discoveredLinks) {
    const response = await page.request.get(href);
    expect(response.status(), `${href} linked route status`).toBeLessThan(400);
  }
});

test("site metadata endpoints use the production origin", async ({ page }) => {
  await gotoStorefront(page, "/");
  await expect(page).toHaveTitle("SAVANCEX — Independent Streetwear");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://savancex.art",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "https://savancex.art",
  );

  for (const route of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest"]) {
    const response = await page.request.get(route);
    expect(response.status(), route).toBe(200);
  }

  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  const publicRoutes = await getPublicRoutes(page);
  for (const route of publicRoutes) {
    const expectedUrl = route === "/" ? "https://savancex.art" : `https://savancex.art${route}`;
    expect(sitemap, `sitemap entry for ${route}`).toContain(expectedUrl);
  }
});

test("Stripe webhook rejects unsigned requests", async ({ page }) => {
  const response = await page.request.post("/api/stripe/webhook", {
    data: { type: "checkout.session.completed" },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "Missing Stripe signature.",
  });
});
