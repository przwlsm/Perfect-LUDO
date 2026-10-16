import { tipProducts, type TipProduct } from 'app-kit';

/**
 * Everything Tambola Party sells, all through the platform store's own
 * billing. Playing is never sold: every mode and up to six tickets are free.
 *
 * - Plus: one purchase, forever. Premium ticket themes, dabbers, the
 *   fun-call voice, and shared ticket images without the watermark.
 * - Tips: "buy us a chai". They unlock nothing.
 */
export const PLUS_SKU = 'tambola.plus';

export const TIP_PRODUCTS: readonly TipProduct[] = tipProducts('tambola');

export const ALL_SKUS: readonly string[] = [PLUS_SKU, ...TIP_PRODUCTS.map((t) => t.sku)];
