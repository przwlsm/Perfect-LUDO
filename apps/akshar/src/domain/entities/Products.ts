import { tipProducts } from 'app-kit';

/**
 * Everything Akshar sells, through the platform store's own billing only.
 *
 * - Plus: one purchase, forever. Premium papers and pens, unlimited "show
 *   me" hints, practice sheets and slates shared without the watermark.
 *   Every script, letter and practice stays free.
 * - Tips: they unlock nothing; they are a thank-you.
 */
export const PRODUCT_PREFIX = 'akshar';
export const PLUS_SKU = `${PRODUCT_PREFIX}.plus`;
export const TIP_PRODUCTS = tipProducts(PRODUCT_PREFIX);
export const ALL_SKUS: readonly string[] = [PLUS_SKU, ...TIP_PRODUCTS.map((t) => t.sku)];
