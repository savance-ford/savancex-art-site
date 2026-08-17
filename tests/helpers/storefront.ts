import { expect, type Page } from "@playwright/test";

export const SITE_ORIGIN = "http://127.0.0.1:3100";
export const REFERENCE_ORIGIN = "http://127.0.0.1:4173";

export async function waitForStorefront(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => {
    await document.fonts.ready;

    const images = Array.from(document.images).filter((image) => {
      const bounds = image.getBoundingClientRect();
      return image.loading !== "lazy" || bounds.top < window.innerHeight * 2;
    });
    await Promise.all(
      images.map(
        (image) =>
          image.complete ||
          new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    );
  });
}

export async function loadAllPageImages(page: Page): Promise<void> {
  await waitForStorefront(page);
  await page.locator("#main img, .site-footer img, .site-header img").evaluateAll(
    (images) => {
      for (const image of images) (image as HTMLImageElement).loading = "eager";
    },
  );
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight, 500);
    for (let offset = 0; offset < document.documentElement.scrollHeight; offset += step) {
      window.scrollTo(0, offset);
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() =>
    Array.from(
      document.querySelectorAll<HTMLImageElement>(
        "#main img, .site-footer img, .site-header img",
      ),
    )
      .every((image) => image.complete),
  );
  await page.locator("#main img, .site-footer img, .site-header img").evaluateAll(
    async (images) => {
      await Promise.all(
        images.map((image) => (image as HTMLImageElement).decode().catch(() => undefined)),
      );
    },
  );
  await waitForStorefront(page);
}

export async function gotoStorefront(
  page: Page,
  path: string,
): Promise<void> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `No navigation response for ${path}`).not.toBeNull();
  expect(response?.status(), `${path} should load successfully`).toBeLessThan(400);
  await waitForStorefront(page);
}
