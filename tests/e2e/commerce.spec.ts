import { expect, test } from "@playwright/test";
import { products } from "../../data/products";
import { gotoStorefront } from "../helpers/storefront";

test("product options, cart persistence, quantities, and removal work", async ({
  page,
}) => {
  await gotoStorefront(page, "/products/signal-loss");

  await page.locator('[data-color="Bone"]').click();
  await page.locator('[data-size="XL"]').click();
  await expect(page.locator('[data-color="Bone"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-size="XL"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const addButton = page.locator('[data-action="add-product"]');
  await addButton.click();
  await expect(page.locator(".drawer")).toHaveClass(/is-open/);
  await expect(page.locator(".drawer .cart-line__meta")).toHaveText("Bone / XL");
  await expect(page.locator('[data-cart-count]:visible').first()).toHaveText("1");

  await page.keyboard.press("Escape");
  await expect(page.locator(".drawer")).not.toHaveClass(/is-open/);
  await expect(addButton).toBeFocused();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-cart-count]:visible').first()).toHaveText("1");
  await page.locator('[data-action="open-cart"]:visible').click();
  await page.locator('.drawer [data-action="qty-inc"]').click();
  await expect(page.locator('[data-cart-count]:visible').first()).toHaveText("2");
  await page.locator('.drawer [data-action="qty-dec"]').click();
  await expect(page.locator('[data-cart-count]:visible').first()).toHaveText("1");
  await page.locator('.drawer [data-action="remove-line"]').click();
  await expect(page.locator(".drawer")).toContainText("Your bag is empty.");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-cart-count]:visible').first()).toHaveText("0");
});

test("sold-out products cannot be added", async ({ page }) => {
  await gotoStorefront(page, "/products/blue-noise");
  await expect(page.locator('[data-action="add-product"]')).toBeDisabled();
  await expect(page.locator('[data-cart-count]:visible').first()).toHaveText("0");
});

test("search updates locally and links to the full results route", async ({
  page,
}) => {
  await gotoStorefront(page, "/");
  const searchButton = page.locator('[data-action="open-search"]:visible');
  await searchButton.click();

  const searchInput = page.locator(".search-overlay__form input");
  await expect(searchInput).toBeFocused();
  await searchInput.fill("hoodie");
  await expect(page.locator(".search-overlay .product-card")).not.toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page.locator(".search-overlay")).not.toHaveClass(/is-open/);
  await expect(searchButton).toBeFocused();

  await searchButton.click();
  await searchInput.fill("hoodie");
  await searchInput.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=hoodie$/);
  await expect(page.locator(".content-page .product-card")).not.toHaveCount(0);
});

test("catalog filtering, empty state reset, and sorting work", async ({ page }) => {
  await gotoStorefront(page, "/shop");
  await page.locator('[data-action="sort"]').selectOption("price-desc");
  await expect(
    page.locator(".shop-results [data-product-card]").first(),
  ).toHaveAttribute(
    "data-product-card",
    "night-drive",
  );

  await page.locator('[data-action="open-filter"]').click();
  await page.locator('[data-filter-category][value="T-Shirts"]').check();
  await page.locator("[data-filter-available]").check();
  await page.locator("[data-filter-under50]").check();
  await page.locator('[data-action="apply-filters"]').click();

  const expectedCount = products.filter(
    (product) =>
      product.category === "T-Shirts" && !product.soldOut && product.price < 50,
  ).length;
  await expect(page.locator(".shop-results [data-product-card]")).toHaveCount(
    expectedCount,
  );

  await page.locator('[data-action="open-filter"]').click();
  await page.locator('[data-filter-category][value="T-Shirts"]').uncheck();
  await page.locator('[data-filter-category][value="Hoodies"]').check();
  await page.locator('[data-action="apply-filters"]').click();
  await expect(page.locator(".shop-results .empty-state")).toContainText(
    "No signal found.",
  );
  await page
    .locator('.shop-results .empty-state [data-action="reset-filters"]')
    .click();
  await expect(page.locator(".shop-results [data-product-card]")).toHaveCount(
    products.length,
  );
});

test("cart page uses the shared persisted cart", async ({ page }) => {
  await gotoStorefront(page, "/products/signal-loss");
  await page.locator('[data-action="add-product"]').click();
  await page.keyboard.press("Escape");
  await gotoStorefront(page, "/cart");

  await expect(page.locator(".cart-page .cart-line")).toHaveCount(1);
  await expect(page.locator(".cart-page .cart-line__meta")).toHaveText("Black / M");
  await page.locator('.cart-page [data-action="qty-inc"]').click();
  await expect(page.locator('[data-cart-count]:visible').first()).toHaveText("2");
  await page.locator('.cart-page [data-action="remove-line"]').click();
  await expect(page.locator(".cart-page")).toContainText("Your bag is empty.");
});
