/**
 * The rules of classic Ludo as played here, in order. Text lives in the
 * catalogue: game:rules.<id>.title and game:rules.<id>.text.
 */
export const RULES = [
  { n: '01', id: 'entrance' },
  { n: '02', id: 'home' },
  { n: '03', id: 'rivalry' },
  { n: '04', id: 'fair' },
  { n: '05', id: 'finish' },
] as const;
