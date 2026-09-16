"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useStorefrontOverlay } from "@/components/overlays/OverlayProvider";
import { useToast } from "@/components/overlays/ToastProvider";
import type {
  CatalogProduct,
  CommerceVariant,
} from "@/lib/commerce/types";
import type { CartLine, CartLineKey } from "@/types/commerce";

export const CART_STORAGE_KEY = "savancex-cart-v2";
export const LEGACY_CART_STORAGE_KEY = "savancex-cart-v1";

const CART_CHANGE_EVENT = "savancex-cart-change";
const EMPTY_CART_SNAPSHOT = "[]";

let fallbackSnapshot: string | null = null;

export interface AddCartItemInput {
  readonly productId: string;
  readonly variantId?: string;
  readonly color?: string;
  readonly size?: string;
  readonly quantity?: number;
}

interface CartContextValue {
  readonly catalog: readonly CatalogProduct[];
  readonly catalogAvailable: boolean;
  readonly lines: readonly CartLine[];
  readonly cartCount: number;
  readonly subtotal: number;
  readonly isHydrated: boolean;
  readonly isCartDrawerOpen: boolean;
  readonly addItem: (input: AddCartItemInput) => void;
  readonly incrementLine: (key: CartLineKey) => void;
  readonly decrementLine: (key: CartLineKey) => void;
  readonly removeLine: (key: CartLineKey) => void;
  readonly clearCart: () => void;
  readonly openCartDrawer: () => void;
  readonly closeCartDrawer: () => void;
}

interface CartProviderProps {
  readonly catalog: readonly CatalogProduct[];
  readonly catalogAvailable: boolean;
  readonly children: ReactNode;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function getServerCartSnapshot(): string {
  return EMPTY_CART_SNAPSHOT;
}

function getCartSnapshot(): string {
  if (typeof window === "undefined") return EMPTY_CART_SNAPSHOT;
  if (fallbackSnapshot !== null) return fallbackSnapshot;

  try {
    return (
      window.localStorage.getItem(CART_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_CART_STORAGE_KEY) ??
      EMPTY_CART_SNAPSHOT
    );
  } catch {
    return EMPTY_CART_SNAPSHOT;
  }
}

function subscribeToCart(onStoreChange: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (
      event.key === CART_STORAGE_KEY ||
      event.key === LEGACY_CART_STORAGE_KEY
    ) {
      fallbackSnapshot = null;
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CART_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CART_CHANGE_EVENT, onStoreChange);
  };
}

function subscribeToHydration(): () => void {
  return () => undefined;
}

function getHydratedSnapshot(): boolean {
  return true;
}

function getServerHydratedSnapshot(): boolean {
  return false;
}

function preferredVariant(
  variants: readonly CommerceVariant[],
): CommerceVariant | undefined {
  const available = variants.filter((variant) => variant.available);
  return (
    available.find((variant) => variant.options.size === "M") ?? available[0]
  );
}

function resolveVariant(
  candidate: object,
  product: CatalogProduct,
): CommerceVariant | undefined {
  const variantId = Reflect.get(candidate, "variantId");
  if (typeof variantId === "string") {
    return product.variants.find(
      (variant) => variant.id === variantId && variant.available,
    );
  }

  const color = Reflect.get(candidate, "color");
  const size = Reflect.get(candidate, "size");
  if (typeof color !== "string" || typeof size !== "string") return undefined;

  return product.variants.find(
    (variant) =>
      variant.available &&
      variant.options.color === color &&
      variant.options.size === size,
  );
}

function parseCartSnapshot(
  snapshot: string,
  catalog: readonly CatalogProduct[],
): CartLine[] {
  try {
    const value: unknown = JSON.parse(snapshot);
    if (!Array.isArray(value)) return [];

    const productsById = new Map(
      catalog.map((product) => [product.id, product] as const),
    );
    const mergedLines = new Map<CartLineKey, CartLine>();

    for (const candidate of value) {
      if (!candidate || typeof candidate !== "object") continue;

      const productId = Reflect.get(candidate, "productId");
      const storedQuantity =
        Reflect.get(candidate, "quantity") ?? Reflect.get(candidate, "qty");
      if (
        typeof productId !== "string" ||
        typeof storedQuantity !== "number" ||
        !Number.isSafeInteger(storedQuantity) ||
        storedQuantity < 1
      ) {
        continue;
      }

      const product = productsById.get(productId);
      if (!product) continue;
      const variant = resolveVariant(candidate, product);
      if (!variant) continue;

      const line: CartLine = {
        productId: product.id,
        variantId: variant.id,
        printfulSyncVariantId: variant.printfulSyncVariantId,
        printfulCatalogVariantId: variant.printfulCatalogVariantId,
        color: variant.options.color,
        size: variant.options.size,
        quantity: storedQuantity,
        displayPrice: variant.price,
      };
      const key = getCartLineKey(line);
      const existing = mergedLines.get(key);

      if (existing) existing.quantity += line.quantity;
      else mergedLines.set(key, line);
    }

    return Array.from(mergedLines.values());
  } catch {
    return [];
  }
}

function writeCart(lines: readonly CartLine[]): void {
  const snapshot = JSON.stringify(lines);

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, snapshot);
    fallbackSnapshot = null;
  } catch {
    fallbackSnapshot = snapshot;
  }

  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

export function getCartLineKey(
  line: Pick<CartLine, "productId" | "variantId">,
): CartLineKey {
  return `${line.productId}::${line.variantId}`;
}

export function CartProvider({
  catalog,
  catalogAvailable,
  children,
}: CartProviderProps) {
  const snapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const lines = useMemo(
    () => parseCartSnapshot(snapshot, catalog),
    [catalog, snapshot],
  );
  const productsById = useMemo(
    () => new Map(catalog.map((product) => [product.id, product] as const)),
    [catalog],
  );
  const {
    activeOverlay,
    openCartDrawer,
    closeOverlay: closeCartDrawer,
  } = useStorefrontOverlay();
  const { showToast } = useToast();

  useEffect(() => {
    if (!catalogAvailable) return;

    try {
      if (
        window.localStorage.getItem(CART_STORAGE_KEY) === null &&
        window.localStorage.getItem(LEGACY_CART_STORAGE_KEY) !== null
      ) {
        writeCart(lines);
      }
    } catch {
      // Storage may be unavailable; the in-memory snapshot still works.
    }
  }, [catalogAvailable, lines]);

  const updateCart = useCallback(
    (update: (currentLines: readonly CartLine[]) => readonly CartLine[]) => {
      writeCart(update(parseCartSnapshot(getCartSnapshot(), catalog)));
    },
    [catalog],
  );

  const cartCount = useMemo(
    () => lines.reduce((total, line) => total + line.quantity, 0),
    [lines],
  );
  const subtotal = useMemo(
    () =>
      lines.reduce(
        (total, line) =>
          total + (line.displayPrice.amount / 100) * line.quantity,
        0,
      ),
    [lines],
  );

  const addItem = useCallback(
    ({
      productId,
      variantId,
      color,
      size,
      quantity = 1,
    }: AddCartItemInput) => {
      const product = productsById.get(productId);
      if (!product?.available) return;

      const variant = variantId
        ? product.variants.find(
            (candidate) => candidate.id === variantId && candidate.available,
          )
        : product.variants.find(
            (candidate) =>
              candidate.available &&
              (!color || candidate.options.color === color) &&
              (!size || candidate.options.size === size),
          ) ?? preferredVariant(product.variants);
      const safeQuantity = Number.isSafeInteger(quantity)
        ? Math.max(1, quantity)
        : 1;
      if (!variant) return;

      updateCart((currentLines) => {
        const nextLines = currentLines.map((line) => ({ ...line }));
        const key = getCartLineKey({ productId, variantId: variant.id });
        const existing = nextLines.find(
          (line) => getCartLineKey(line) === key,
        );

        if (existing) {
          existing.quantity += safeQuantity;
        } else {
          nextLines.push({
            productId,
            variantId: variant.id,
            printfulSyncVariantId: variant.printfulSyncVariantId,
            printfulCatalogVariantId: variant.printfulCatalogVariantId,
            color: variant.options.color,
            size: variant.options.size,
            quantity: safeQuantity,
            displayPrice: variant.price,
          });
        }

        return nextLines;
      });

      showToast(`${product.name} added to bag`);
      openCartDrawer();
    },
    [openCartDrawer, productsById, showToast, updateCart],
  );

  const incrementLine = useCallback(
    (key: CartLineKey) => {
      updateCart((currentLines) =>
        currentLines.map((line) =>
          getCartLineKey(line) === key
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        ),
      );
    },
    [updateCart],
  );

  const decrementLine = useCallback(
    (key: CartLineKey) => {
      updateCart((currentLines) =>
        currentLines.flatMap((line) => {
          if (getCartLineKey(line) !== key) return [line];
          return line.quantity > 1
            ? [{ ...line, quantity: line.quantity - 1 }]
            : [];
        }),
      );
    },
    [updateCart],
  );

  const removeLine = useCallback(
    (key: CartLineKey) => {
      updateCart((currentLines) =>
        currentLines.filter((line) => getCartLineKey(line) !== key),
      );
    },
    [updateCart],
  );

  const clearCart = useCallback(() => writeCart([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      catalog,
      catalogAvailable,
      lines,
      cartCount,
      subtotal,
      isHydrated,
      isCartDrawerOpen: activeOverlay === "cart",
      addItem,
      incrementLine,
      decrementLine,
      removeLine,
      clearCart,
      openCartDrawer,
      closeCartDrawer,
    }),
    [
      catalog,
      catalogAvailable,
      lines,
      cartCount,
      subtotal,
      isHydrated,
      activeOverlay,
      addItem,
      incrementLine,
      decrementLine,
      removeLine,
      clearCart,
      openCartDrawer,
      closeCartDrawer,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
