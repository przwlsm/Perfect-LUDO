import { tipProducts } from 'app-kit';

/**
 * Everything Speak Local sells, through the platform store's own billing.
 *
 * - Plus: one purchase, forever. The bonus scene packs, every chat colour,
 *   the full history of your recordings, and phrase cards shared without
 *   the watermark. Every core scene, quiz, review and the phrasebook stay
 *   free.
 * - Tips: a thank-you; they unlock nothing.
 */
export const PRODUCT_PREFIX = 'speaklocal';
export const PLUS_SKU = `${PRODUCT_PREFIX}.plus`;
export const TIP_PRODUCTS = tipProducts(PRODUCT_PREFIX);
export const ALL_SKUS: readonly string[] = [PLUS_SKU, ...TIP_PRODUCTS.map((t) => t.sku)];
