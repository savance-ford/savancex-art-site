import { test } from "@playwright/test";
import { gotoStorefront } from "../helpers/storefront";
import { compareScreenshotToSuppliedReference } from "../helpers/visual";

async function getUnstableLazyImageAreas(page: import("@playwright/test").Page) {
  return page
    .locator(
      ".reference-section--capsule .product-card__media, " +
        ".reference-section--classics .product-card__media, " +
        ".reference-community__card",
    )
    .evaluateAll((elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          x: bounds.x + window.scrollX,
          y: bounds.y + window.scrollY,
          width: bounds.width,
          height: bounds.height,
        };
      }),
    );
}

test.describe("supplied desktop reference screenshots", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("1440px homepage", async ({ page }, testInfo) => {
    await gotoStorefront(page, "/");
    const maskAreas = await getUnstableLazyImageAreas(page);
    const screenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: true,
    });

    await compareScreenshotToSuppliedReference(
      screenshot,
      "PREVIEW_HOME_DESKTOP.png",
      testInfo,
      0.01,
      maskAreas,
    );
  });

  test("1440px shop page", async ({ page }, testInfo) => {
    await gotoStorefront(page, "/shop");
    const screenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
    });

    await compareScreenshotToSuppliedReference(
      screenshot,
      "PREVIEW_SHOP.png",
      testInfo,
      0.01,
    );
  });

  test("1440px product page", async ({ page }, testInfo) => {
    await gotoStorefront(page, "/products/signal-loss");
    const screenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
    });

    await compareScreenshotToSuppliedReference(
      screenshot,
      "PREVIEW_PRODUCT.png",
      testInfo,
      0.011,
    );
  });
});

test.describe("supplied mobile reference screenshot", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("390px homepage", async ({ page }, testInfo) => {
    await gotoStorefront(page, "/");
    const maskAreas = await getUnstableLazyImageAreas(page);
    const screenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: true,
    });

    await compareScreenshotToSuppliedReference(
      screenshot,
      "PREVIEW_HOME_MOBILE.png",
      testInfo,
      0.011,
      maskAreas,
    );
  });
});
