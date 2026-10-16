/**
 * The ingredients poured in Chai Sort. Each has its own colour AND its own
 * symbol, because colour is the whole rule and nobody should need to see
 * every colour to play.
 *
 * The order is the order players meet them: the first levels use the first
 * few. Spices are special: a spice layer only pours onto the same spice,
 * never into an empty cup.
 */
export type IngredientId =
  | 'masala'
  | 'milk'
  | 'ginger'
  | 'cardamom'
  | 'saffron'
  | 'rose'
  | 'mint'
  | 'lemon'
  | 'coffee'
  | 'bluepea'
  | 'hibiscus'
  | 'pepper'
  | 'kokum';

/** The little mark drawn on every layer of an ingredient. */
export type Mark =
  | 'star'
  | 'drop'
  | 'zigzag'
  | 'pod'
  | 'threads'
  | 'flower'
  | 'leaf'
  | 'slice'
  | 'bean'
  | 'petal'
  | 'heart'
  | 'peppercorns'
  | 'crescent';

export interface Ingredient {
  readonly id: IngredientId;
  /** The liquid's colour. */
  readonly colour: string;
  /** A lighter tone for the surface and highlights. */
  readonly light: string;
  readonly mark: Mark;
  readonly spice: boolean;
}

export const INGREDIENTS: readonly Ingredient[] = [
  { id: 'masala', colour: '#94501f', light: '#c47f45', mark: 'star', spice: false },
  { id: 'milk', colour: '#f3ead9', light: '#fffaf0', mark: 'drop', spice: false },
  { id: 'ginger', colour: '#e2a52c', light: '#f5c95e', mark: 'zigzag', spice: false },
  { id: 'cardamom', colour: '#79a64a', light: '#a3cc72', mark: 'pod', spice: false },
  { id: 'saffron', colour: '#f05a1a', light: '#ff8f4d', mark: 'threads', spice: false },
  { id: 'rose', colour: '#e8769f', light: '#f7a5c3', mark: 'flower', spice: false },
  { id: 'mint', colour: '#2fb795', light: '#6edcbf', mark: 'leaf', spice: false },
  { id: 'lemon', colour: '#ece25f', light: '#fbf49b', mark: 'slice', spice: false },
  { id: 'coffee', colour: '#4a2b1d', light: '#7a4a33', mark: 'bean', spice: false },
  { id: 'bluepea', colour: '#4d6dd4', light: '#7f9bf0', mark: 'petal', spice: false },
  { id: 'hibiscus', colour: '#c4243c', light: '#e85a6c', mark: 'heart', spice: false },
  { id: 'pepper', colour: '#5a6170', light: '#8a92a3', mark: 'peppercorns', spice: true },
  { id: 'kokum', colour: '#7b3a96', light: '#a866c4', mark: 'crescent', spice: true },
];

/** How many ordinary (non-spice) ingredients there are. */
export const PLAIN_COUNT = INGREDIENTS.filter((i) => !i.spice).length;
/** Indexes of the spice ingredients. */
export const SPICES: readonly number[] = INGREDIENTS.flatMap((ing, i) => (ing.spice ? [i] : []));

export function ingredientAt(index: number): Ingredient {
  return INGREDIENTS[index] ?? INGREDIENTS[0]!;
}

export function isSpice(index: number): boolean {
  return INGREDIENTS[index]?.spice === true;
}
