import { tipProducts, type TipProduct } from 'app-kit';

/**
 * Everything Utsav sells, all through the platform store's own billing.
 *
 * - Plus: one purchase, forever. Every premium design, HD and status-size
 *   cards, custom lettering, and no "Utsav" mark on shared cards. Making
 *   and sharing cards is never locked.
 * - Tips: "buy us a chai". They unlock nothing.
 */
export const PRODUCT_PREFIX = 'utsav';
export const PLUS_SKU = `${PRODUCT_PREFIX}.plus`;
export const TIP_PRODUCTS: readonly TipProduct[] = tipProducts(PRODUCT_PREFIX);
export const ALL_SKUS: readonly string[] = [PLUS_SKU, ...TIP_PRODUCTS.map((t) => t.sku)];
