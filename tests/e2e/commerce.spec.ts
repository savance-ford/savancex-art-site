import { expect, test, type Page } from "@playwright/test";
import { gotoStorefront } from "../helpers/storefront";

const CART_KEY = "savancex-cart-v2";
const LEGACY_CART_KEY = "savancex-cart-v1";

async function gotoFirstProduct(page: Page): Promise<void> {
  await gotoStorefront(page, "/shop");
  const href = await page
    .locator(".shop-results [data-product-card] .product-card__name a")
    .first()
    .getAttribute("href");
  expect(href, "the database catalog should expose at least one product").toBeTruthy();
  await gotoStorefront(page, href as string);
}

test("product options, v2 cart persistence, quantities, and removal work", async ({
  page,
}) => {
  await gotoFirstProduct(page);

  const colorButton = page.locator('[data-action="select-color"]:not(:disabled)').last();
  const sizeButton = page.locator('[data-action="select-size"]:not(:disabled)').last();
  const color = await colorButton.getAttribute("data-color");
  const size = await sizeButton.getAttribute("data-size");
  await colorButton.click();
  await sizeButton.click();
  await expect(colorButton).toHaveAttribute("aria-pressed", "true");
  await expect(sizeButton).toHaveAttribute("aria-pressed", "true");

  const addButton = page.locator('[data-action="add-product"]');
  await addButton.click();
  await expect(page.locator(".drawer")).toHaveClass(/is-open/);
  await expect(page.locator(".drawer .cart-line__meta")).toHaveText(
    `${color} / ${size}`,
  );
  await expect(page.locator("[data-cart-count]:visible").first()).toHaveText("1");

  const storedLine = await page.evaluate((key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value)[0] : null;
  }, CART_KEY);
  expect(storedLine).toMatchObject({
    productId: expect.any(String),
    variantId: expect.any(String),
    printfulSyncVariantId: expect.any(String),
    printfulCatalogVariantId: expect.any(String),
    color,
    size,
    quantity: 1,
    displayPrice: { amount: expect.any(Number), currency: "USD" },
  });

  await page.keyboard.press("Escape");
  await expect(page.locator(".drawer")).not.toHaveClass(/is-open/);
  await expect(addButton).toBeFocused();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-cart-count]:visible").first()).toHaveText("1");
  await page.locator('[data-action="open-cart"]:visible').click();
  await page.locator('.drawer [data-action="qty-inc"]').click();
  await expect(page.locator("[data-cart-count]:visible").first()).toHaveText("2");
  await page.locator('.drawer [data-action="qty-dec"]').click();
  await expect(page.locator("[data-cart-count]:visible").first()).toHaveText("1");
  await page.locator('.drawer [data-action="remove-line"]').click();
  await expect(page.locator(".drawer")).toContainText("Your bag is empty.");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-cart-count]:visible").first()).toHaveText("0");
});

test("sold-out database products cannot be added", async ({ page }) => {
  await gotoStorefront(page, "/shop");
  const soldOutButtons = page.locator('[data-action="quick-add"]:disabled');
  test.skip(
    (await soldOutButtons.count()) === 0,
    "The current database catalog has no sold-out product.",
  );

  await expect(soldOutButtons.first()).toBeDisabled();
  await expect(page.locator("[data-cart-count]:visible").first()).toHaveText("0");
});

test("search updates locally and links to the full results route", async ({
  page,
}) => {
  await gotoStorefront(page, "/shop");
  const productName = await page.locator(".product-card__name").first().innerText();
  const query = productName.split(/\s+/).find((word) => word.length >= 3) ?? productName;

  await gotoStorefront(page, "/");
  const searchButton = page.locator('[data-action="open-search"]:visible');
  await searchButton.click();

  const searchInput = page.locator(".search-overlay__form input");
  await expect(searchInput).toBeFocused();
  await searchInput.fill(query);
  await expect(page.locator(".search-overlay .product-card")).not.toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page.locator(".search-overlay")).not.toHaveClass(/is-open/);
  await expect(searchButton).toBeFocused();

  await searchButton.click();
  await searchInput.fill(query);
  await searchInput.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`/search\\?q=${encodeURIComponent(query)}$`, "i"),
  );
  await expect(page.locator(".content-page .product-card")).not.toHaveCount(0);
});

test("catalog filtering, empty state reset, and sorting work", async ({ page }) => {
  await gotoStorefront(page, "/shop");
  const cards = page.locator(".shop-results [data-product-card]");
  const catalogRows = await cards.evaluateAll((elements) =>
    elements.map((element) => ({
      id: element.getAttribute("data-product-card") ?? "",
      category: element.getAttribute("data-category") ?? "",
      price: Number(element.getAttribute("data-price")),
      available: element.getAttribute("data-available") === "true",
    })),
  );
  expect(catalogRows.length).toBeGreaterThan(0);

  await page.locator('[data-action="sort"]').selectOption("price-desc");
  const highestPriced = [...catalogRows].sort((left, right) => right.price - left.price)[0];
  await expect(cards.first()).toHaveAttribute("data-product-card", highestPriced.id);

  const supportedCategories = ["T-Shirts", "Hoodies", "Crewnecks"];
  const selectedCategory = supportedCategories.find((category) =>
    catalogRows.some(
      (product) =>
        product.category === category && product.available && product.price < 5_000,
    ),
  );
  test.skip(!selectedCategory, "No current catalog category supports this filter combination.");

  await page.locator('[data-action="open-filter"]').click();
  await page
    .locator(`[data-filter-category][value="${selectedCategory}"]`)
    .check();
  await page.locator("[data-filter-available]").check();
  await page.locator("[data-filter-under50]").check();
  await page.locator('[data-action="apply-filters"]').click();

  const expectedCount = catalogRows.filter(
    (product) =>
      product.category === selectedCategory &&
      product.available &&
      product.price < 5_000,
  ).length;
  await expect(cards).toHaveCount(expectedCount);

  await page.locator('[data-action="open-filter"]').click();
  await page.locator('[data-action="reset-filters"]').last().click();
  await expect(cards).toHaveCount(catalogRows.length);
});

test("cart page uses the shared persisted cart", async ({ page }) => {
  await gotoFirstProduct(page);
  await page.locator('[data-action="add-product"]').click();
  await page.keyboard.press("Escape");
  await gotoStorefront(page, "/cart");

  await expect(page.locator(".cart-page .cart-line")).toHaveCount(1);
  await page.locator('.cart-page [data-action="qty-inc"]').click();
  await expect(page.locator("[data-cart-count]:visible").first()).toHaveText("2");
  await page.locator('.cart-page [data-action="remove-line"]').click();
  await expect(page.locator(".cart-page")).toContainText("Your bag is empty.");
});

test("a resolvable v1 cart migrates to a normalized v2 variant line", async ({
  page,
}) => {
  await gotoFirstProduct(page);
  const addButton = page.locator('[data-action="add-product"]');
  const productId = await addButton.getAttribute("data-product");
  const color = await page.locator("[data-selected-color]").innerText();
  const size = await page.locator("[data-selected-size]").innerText();
  expect(productId).toBeTruthy();

  await page.evaluate(
    ({ legacyKey, v2Key, line }) => {
      localStorage.removeItem(v2Key);
      localStorage.setItem(legacyKey, JSON.stringify([line]));
    },
    {
      legacyKey: LEGACY_CART_KEY,
      v2Key: CART_KEY,
      line: { productId, color, size, qty: 2 },
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-cart-count]:visible").first()).toHaveText("2");

  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), CART_KEY))
    .not.toBeNull();
  const migratedLine = await page.evaluate((key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value)[0] : null;
  }, CART_KEY);
  expect(migratedLine).toMatchObject({
    productId,
    variantId: expect.any(String),
    quantity: 2,
    color,
    size,
  });
});
