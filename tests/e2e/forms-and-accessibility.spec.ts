import { expect, test } from "@playwright/test";
import { gotoStorefront } from "../helpers/storefront";

const CART_KEY = "savancex-cart-v1";

test("support and newsletter forms validate and remain local", async ({ page }) => {
  const networkSubmissions: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method())) {
      networkSubmissions.push(`${request.method()} ${request.url()}`);
    }
  });

  await gotoStorefront(page, "/contact");
  await page.locator('[data-form="contact"] button[type="submit"]').click();
  expect(await page.locator('[data-form="contact"] :invalid').count()).toBeGreaterThan(0);
  await page.getByLabel("Name *").fill("Test Customer");
  await page.getByLabel("Email *").fill("customer@example.com");
  await page.getByLabel("Message *").fill("Testing the local support form.");
  await page.locator('[data-form="contact"] button[type="submit"]').click();
  await expect(page.getByRole("status")).toContainText("no email was sent");

  await gotoStorefront(page, "/track-order");
  const trackingForm = page.locator('[data-form="tracking"]');
  await trackingForm.locator('button[type="submit"]').click();
  expect(await trackingForm.locator(":invalid").count()).toBeGreaterThan(0);
  await trackingForm.getByLabel("Order number").fill("#10042");
  await trackingForm.getByLabel("Email address").fill("customer@example.com");
  await trackingForm.locator('button[type="submit"]').click();
  await expect(page.locator("#tracking-result")).toContainText("In transit");

  await gotoStorefront(page, "/account");
  const accountForm = page.locator('[data-form="account"]');
  await accountForm.getByRole("button", { name: "Log in" }).click();
  expect(await accountForm.locator(":invalid").count()).toBeGreaterThan(0);
  await accountForm.getByLabel("Email address").fill("customer@example.com");
  await accountForm.getByLabel("Password").fill("prototype-only");
  await accountForm.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator(".toast")).toContainText("no account service connected");

  await gotoStorefront(page, "/");
  await page.locator('[data-form="newsletter"] button[type="submit"]').click();
  expect(await page.locator('[data-form="newsletter"] :invalid').count()).toBeGreaterThan(0);
  await page.getByLabel("Email address").last().fill("customer@example.com");
  await page.locator('[data-form="newsletter"] button[type="submit"]').click();
  await expect(page.locator('[data-form="newsletter"]')).toContainText(
    "You’re on the list.",
  );

  expect(networkSubmissions).toEqual([]);
});

test("checkout is explicitly non-transactional and keeps the cart", async ({
  context,
  page,
}) => {
  const savedCart = [
    { productId: "signal-loss", color: "Black", size: "M", qty: 1 },
  ];
  await context.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: CART_KEY, value: JSON.stringify(savedCart) },
  );
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/")) apiRequests.push(request.url());
  });

  await gotoStorefront(page, "/checkout");
  await expect(page.getByText("Payment placeholder", { exact: true })).toBeVisible();
  await expect(page.locator('input[name*="card" i]')).toHaveCount(0);

  await page.getByLabel("Email").fill("customer@example.com");
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("Customer");
  await page.getByLabel("Address").fill("123 Test Street");
  await page.getByLabel("City").fill("Madison");
  await page.getByLabel("State").selectOption("Wisconsin");
  await page.getByLabel("ZIP code").fill("53703");
  await page.getByRole("button", { name: "Complete demo order" }).click();
  await expect(page.locator(".checkout-note")).toContainText(
    "no payment was processed and no order was sent",
  );
  expect(apiRequests).toEqual([]);
  expect(await page.evaluate((key) => localStorage.getItem(key), CART_KEY)).toBe(
    JSON.stringify(savedCart),
  );
});

test("Escape closes overlays and restores focus to their opener", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await gotoStorefront(page, "/shop");

  const megaButton = page.locator('[data-action="toggle-mega"]');
  await megaButton.click();
  await expect(page.locator(".mega-menu")).toHaveClass(/is-open/);
  await page.locator(".mega-menu a").first().focus();
  await page.keyboard.press("Escape");
  await expect(page.locator(".mega-menu")).not.toHaveClass(/is-open/);
  await expect(megaButton).toBeFocused();

  const cartButton = page.locator('[data-action="open-cart"]:visible');
  await cartButton.click();
  await expect(page.locator('[data-action="close-cart"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(cartButton).toBeFocused();

  const searchButton = page.locator('[data-action="open-search"]:visible');
  await searchButton.click();
  await expect(page.locator(".search-overlay__form input")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(searchButton).toBeFocused();

  const filterButton = page.locator('[data-action="open-filter"]');
  await filterButton.click();
  await expect(page.locator('[data-action="close-filter"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(filterButton).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileButton = page.locator('[data-action="open-mobile"]');
  await mobileButton.click();
  await expect(page.locator('[data-action="close-mobile"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(mobileButton).toBeFocused();
});
