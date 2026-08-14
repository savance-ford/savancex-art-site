export type ProductCategory = "T-Shirts" | "Hoodies" | "Crewnecks";

export type ProductSize = "S" | "M" | "L" | "XL" | "2XL" | "3XL";

export interface Brand {
  name: string;
  tagline: string;
  shippingThreshold: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  collection: string;
  price: number;
  compareAt: number;
  badge: string;
  rating: number;
  reviews: number;
  colors: readonly string[];
  sizes: readonly ProductSize[];
  image: string;
  altImage: string;
  summary: string;
  features: readonly string[];
  fit: string;
  soldOut: boolean;
}

export interface Collection {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  image: string;
}

export interface Review {
  name: string;
  title: string;
  body: string;
  rating: number;
  product: string;
}

export interface CartLine {
  productId: string;
  color: string;
  size: ProductSize;
  qty: number;
}

export interface CatalogFilters {
  categories: ProductCategory[];
  availableOnly: boolean;
  under50: boolean;
}

export type CatalogSort = "featured" | "price-asc" | "price-desc" | "name";
