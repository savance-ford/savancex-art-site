import { expect, test } from "@playwright/test";
import { gotoStorefront } from "../helpers/storefront";

const CART_KEY = "savancex-cart-v2";

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

test("checkout quotes shipping before starting Stripe and keeps the cart", async ({
  page,
}) => {
  await gotoStorefront(page, "/shop");
  const productHref = await page
    .locator(".shop-results .product-card__name a")
    .first()
    .getAttribute("href");
  expect(productHref).toBeTruthy();
  await gotoStorefront(page, productHref as string);
  await page.locator('[data-action="add-product"]').click();
  await page.keyboard.press("Escape");
  const savedCart = await page.evaluate((key) => localStorage.getItem(key), CART_KEY);
  expect(savedCart).toBeTruthy();

  let quoteRequest: Record<string, unknown> | null = null;
  let checkoutRequest: Record<string, unknown> | null = null;
  await page.route("**/api/shipping/quote", async (route) => {
    quoteRequest = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        rates: [
          {
            id: "STANDARD",
            name: "Flat Rate",
            amountCents: 495,
            currency: "USD",
            minDeliveryDays: 3,
            maxDeliveryDays: 6,
            minDeliveryDate: null,
            maxDeliveryDate: null,
          },
        ],
      }),
    });
  });
  await page.route("**/api/stripe/checkout", async (route) => {
    checkoutRequest = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        checkoutUrl: `${new URL(page.url()).origin}/checkout?stripe_mock=1`,
        orderId: "11111111-1111-4111-8111-111111111111",
      }),
    });
  });

  await gotoStorefront(page, "/checkout");
  await expect(page.getByText("Secure Stripe Checkout", { exact: true })).toBeVisible();
  await expect(page.locator('input[name*="card" i]')).toHaveCount(0);

  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Email").fill("customer@example.com");
  await page
    .getByLabel("Street address")
    .fill("4708 Creekwood Lane, Madison, WI 53704, use rear entrance");
  await page.getByLabel("City").fill("Madison");
  await page.getByLabel("State").selectOption("WI");
  await page.getByLabel("ZIP code").fill("53704");
  await page.getByRole("button", { name: "Get shipping methods" }).click();
  await expect(page.locator("#checkout-address-1-error")).toContainText(
    "Street address should contain only the street address",
  );
  expect(quoteRequest).toBeNull();

  await page
    .getByLabel("Street address")
    .fill("4708 Creekwood Lane, Madison, WI 53704, 308");
  await page.getByRole("button", { name: "Get shipping methods" }).click();
  await expect(page.getByText("Flat Rate", { exact: true })).toBeVisible();
  await expect(page.getByText("$4.95", { exact: true })).toBeVisible();

  expect(quoteRequest).toMatchObject({
    address: {
      name: "Test Customer",
      email: "customer@example.com",
      addressLine1: "4708 Creekwood Lane",
      addressLine2: "308",
      city: "Madison",
      stateCode: "WI",
      postalCode: "53704",
      countryCode: "US",
    },
  });
  await expect(page.getByLabel("Street address")).toHaveValue("4708 Creekwood Lane");
  await expect(page.getByLabel("Apartment, suite, unit, etc. (optional)")).toHaveValue("308");

  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page).toHaveURL(/stripe_mock=1/);
  expect(checkoutRequest).toMatchObject({
    shippingMethodId: "STANDARD",
    shippingAddress: {
      addressLine1: "4708 Creekwood Lane",
      addressLine2: "308",
      stateCode: "WI",
      countryCode: "US",
    },
  });
  expect(checkoutRequest).not.toHaveProperty("shippingCents");
  expect(checkoutRequest).not.toHaveProperty("subtotal");
  expect(checkoutRequest).not.toHaveProperty("total");
  expect(await page.evaluate((key) => localStorage.getItem(key), CART_KEY)).toBe(
    savedCart,
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
