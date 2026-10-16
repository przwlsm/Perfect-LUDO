/**
 * The app's colour tokens. Screens never write a raw colour: they use these,
 * so the whole app shifts together when the palette does. One dark scheme
 * for now; a light one joins when appearance settings arrive.
 */
export const colors = {
  background: '#15100d',
  surface: '#241b15',
  text: '#f6eee2',
  muted: '#b9a78f',
  accent: '#e8902f',
  onAccent: '#1d1000',
  /** The board: a warm wood with dark inlaid lines. */
  board: '#d8b784',
  boardLine: '#5b3f22',
  tiger: '#e8902f',
  tigerEdge: '#6d3604',
  goat: '#f5f1e8',
  goatEdge: '#8c8070',
  selected: '#ffd166',
  target: '#3fae5e',
  targetFill: '#3fae5e55',
} as const;
