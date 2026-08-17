import Image from "next/image";
import type { Product } from "@/types/commerce";

interface ProductGalleryProps {
  readonly product: Product;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  return (
    <div className="product-gallery">
      <div className="product-gallery__item">
        <Image
          src={product.image}
          alt={`${product.name} front placeholder`}
          width={800}
          height={900}
          sizes="(max-width: 820px) 86vw, 32vw"
          priority
          unoptimized
        />
      </div>
      <div className="product-gallery__item">
        <Image
          src={product.altImage}
          alt={`${product.name} back placeholder`}
          width={800}
          height={900}
          sizes="(max-width: 820px) 86vw, 32vw"
          loading="eager"
          unoptimized
        />
      </div>
      <div className="product-gallery__item product-gallery__item--wide">
        <Image
          src={product.image}
          alt={`${product.name} detail placeholder`}
          width={800}
          height={900}
          sizes="(max-width: 820px) 86vw, 64vw"
          style={{ objectPosition: "center 34%", transform: "scale(1.15)" }}
          unoptimized
        />
      </div>
    </div>
  );
}
