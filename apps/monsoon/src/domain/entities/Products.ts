import { tipProducts } from 'app-kit';

/**
 * Everything Monsoon Fields sells, through the platform store only.
 *
 * - Plus: one purchase, forever. Unlimited hints, every theme, the whole
 *   daily archive, and shared pictures without the watermark. Every level
 *   and every daily puzzle stay free for everyone.
 * - Tips: they unlock nothing; they are a thank-you.
 */
export const PRODUCT_PREFIX = 'monsoon';
export const PLUS_SKU = `${PRODUCT_PREFIX}.plus`;
export const TIP_PRODUCTS = tipProducts(PRODUCT_PREFIX);
export const ALL_SKUS: readonly string[] = [PLUS_SKU, ...TIP_PRODUCTS.map((t) => t.sku)];
