"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getAllProducts } from "@/lib/commerce/catalog";
import { useStorefrontOverlay } from "@/components/overlays/OverlayProvider";
import { useToast } from "@/components/overlays/ToastProvider";
import type {
  CartLine,
  CartLineKey,
  Product,
  ProductSize,
} from "@/types/commerce";

export const CART_STORAGE_KEY = "savancex-cart-v1";

const CART_CHANGE_EVENT = "savancex-cart-change";
const EMPTY_CART_SNAPSHOT = "[]";
const productsById = new Map(
  getAllProducts().map((product) => [product.id, product] as const),
);

let fallbackSnapshot: string | null = null;

export interface AddCartItemInput {
  readonly productId: Product["id"];
  readonly color?: string;
  readonly size?: ProductSize;
  readonly quantity?: number;
}

interface CartContextValue {
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

const CartContext = createContext<CartContextValue | undefined>(undefined);

function getServerCartSnapshot(): string {
  return EMPTY_CART_SNAPSHOT;
}

function getCartSnapshot(): string {
  if (typeof window === "undefined") return EMPTY_CART_SNAPSHOT;
  if (fallbackSnapshot !== null) return fallbackSnapshot;

  try {
    return window.localStorage.getItem(CART_STORAGE_KEY) ?? EMPTY_CART_SNAPSHOT;
  } catch {
    return EMPTY_CART_SNAPSHOT;
  }
}

function subscribeToCart(onStoreChange: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.key === CART_STORAGE_KEY) {
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

function parseCartSnapshot(snapshot: string): CartLine[] {
  try {
    const value: unknown = JSON.parse(snapshot);
    if (!Array.isArray(value)) return [];

    const mergedLines = new Map<CartLineKey, CartLine>();

    for (const candidate of value) {
      if (!candidate || typeof candidate !== "object") continue;

      const productId = Reflect.get(candidate, "productId");
      const color = Reflect.get(candidate, "color");
      const size = Reflect.get(candidate, "size");
      const qty = Reflect.get(candidate, "qty");

      if (
        typeof productId !== "string" ||
        typeof color !== "string" ||
        typeof size !== "string" ||
        typeof qty !== "number" ||
        !Number.isSafeInteger(qty) ||
        qty < 1
      ) {
        continue;
      }

      const product = productsById.get(productId);
      if (
        !product ||
        !product.colors.includes(color) ||
        !product.sizes.includes(size as ProductSize)
      ) {
        continue;
      }

      const line: CartLine = {
        productId,
        color,
        size: size as ProductSize,
        qty,
      };
      const key = getCartLineKey(line);
      const existing = mergedLines.get(key);

      if (existing) existing.qty += line.qty;
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

function updateCart(
  update: (currentLines: readonly CartLine[]) => readonly CartLine[],
): void {
  writeCart(update(parseCartSnapshot(getCartSnapshot())));
}

export function getCartLineKey(
  line: Pick<CartLine, "productId" | "color" | "size">,
): CartLineKey {
  return `${line.productId}::${line.color}::${line.size}`;
}

export function CartProvider({ children }: { readonly children: ReactNode }) {
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
  const lines = useMemo(() => parseCartSnapshot(snapshot), [snapshot]);
  const {
    activeOverlay,
    openCartDrawer,
    closeOverlay: closeCartDrawer,
  } = useStorefrontOverlay();
  const { showToast } = useToast();

  const cartCount = useMemo(
    () => lines.reduce((total, line) => total + line.qty, 0),
    [lines],
  );
  const subtotal = useMemo(
    () =>
      lines.reduce((total, line) => {
        const product = productsById.get(line.productId);
        return total + (product ? product.price * line.qty : 0);
      }, 0),
    [lines],
  );

  const addItem = useCallback(
    ({
      productId,
      color: requestedColor,
      size: requestedSize,
      quantity = 1,
    }: AddCartItemInput) => {
      const product = productsById.get(productId);
      if (!product || product.soldOut) return;

      const color =
        requestedColor && product.colors.includes(requestedColor)
          ? requestedColor
          : product.colors[0];
      const defaultSize = product.sizes.includes("M")
        ? "M"
        : product.sizes[0];
      const size =
        requestedSize && product.sizes.includes(requestedSize)
          ? requestedSize
          : defaultSize;
      const safeQuantity = Number.isSafeInteger(quantity)
        ? Math.max(1, quantity)
        : 1;

      if (!color || !size) return;

      updateCart((currentLines) => {
        const nextLines = currentLines.map((line) => ({ ...line }));
        const key = getCartLineKey({ productId, color, size });
        const existing = nextLines.find(
          (line) => getCartLineKey(line) === key,
        );

        if (existing) existing.qty += safeQuantity;
        else nextLines.push({ productId, color, size, qty: safeQuantity });

        return nextLines;
      });

      showToast(`${product.name} added to bag`);
      openCartDrawer();
    },
    [openCartDrawer, showToast],
  );

  const incrementLine = useCallback((key: CartLineKey) => {
    updateCart((currentLines) =>
      currentLines.map((line) =>
        getCartLineKey(line) === key ? { ...line, qty: line.qty + 1 } : line,
      ),
    );
  }, []);

  const decrementLine = useCallback((key: CartLineKey) => {
    updateCart((currentLines) =>
      currentLines.flatMap((line) => {
        if (getCartLineKey(line) !== key) return [line];
        return line.qty > 1 ? [{ ...line, qty: line.qty - 1 }] : [];
      }),
    );
  }, []);

  const removeLine = useCallback((key: CartLineKey) => {
    updateCart((currentLines) =>
      currentLines.filter((line) => getCartLineKey(line) !== key),
    );
  }, []);

  const clearCart = useCallback(() => writeCart([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
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
