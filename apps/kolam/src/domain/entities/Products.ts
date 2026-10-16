import { tipProducts, type TipProduct } from 'app-kit';

/**
 * Everything Kolam sells, all through the platform store's own billing.
 * Playing is never sold: every level and every daily kolam is free forever.
 *
 * - Plus: one purchase, forever. Unlimited hints, every theme, the whole
 *   daily archive, and shared kolam pictures without the watermark.
 * - Tips: "buy us a chai". They unlock nothing.
 */
export const PLUS_SKU = 'kolam.plus';

export const TIP_PRODUCTS: readonly TipProduct[] = tipProducts('kolam');

export const ALL_SKUS: readonly string[] = [PLUS_SKU, ...TIP_PRODUCTS.map((t) => t.sku)];
