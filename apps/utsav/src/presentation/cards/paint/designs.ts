import type { DesignId } from '@/domain/entities/Template';
import {
  balloonsDesign,
  baublesDesign,
  bokehDesign,
  cakeDesign,
  chaiDesign,
  confettiDesign,
  fairyLightsDesign,
  floralsDesign,
  gulalDesign,
  heartsDesign,
  moonlitDesign,
  splashDesign,
  sunriseDesign,
  treeDesign,
  wreathDesign,
} from './everyday';
import {
  alponaDesign,
  crescentDesign,
  dandiyaDesign,
  diyasDesign,
  fireworksDesign,
  jaaliDesign,
  kasavuDesign,
  kitesDesign,
  kolamDesign,
  lanternsDesign,
  modakDesign,
  paperArchDesign,
  pongalPotDesign,
  pookalamDesign,
  rakhiDesign,
  rangoliDesign,
  raysDesign,
  toranDesign,
} from './festive';
import type { Ctx } from './kit';
import { lotusDesign } from './lotus';

export interface Design {
  readonly paint: (ctx: Ctx) => void;
  /**
   * How strongly a soft wash of background colour sits behind the words.
   * Busy designs need more; framed ones (arches) need none.
   */
  readonly halo: number;
}

export const DESIGNS: Readonly<Record<DesignId, Design>> = {
  diyas: { paint: diyasDesign, halo: 0.3 },
  rangoli: { paint: rangoliDesign, halo: 0.35 },
  fireworks: { paint: fireworksDesign, halo: 0.45 },
  toran: { paint: toranDesign, halo: 0.35 },
  lanterns: { paint: lanternsDesign, halo: 0.4 },
  gulal: { paint: gulalDesign, halo: 0.75 },
  splash: { paint: splashDesign, halo: 0.6 },
  florals: { paint: floralsDesign, halo: 0.55 },
  confetti: { paint: confettiDesign, halo: 0.65 },
  crescent: { paint: crescentDesign, halo: 0.35 },
  jaali: { paint: jaaliDesign, halo: 0 },
  paperArch: { paint: paperArchDesign, halo: 0 },
  tree: { paint: treeDesign, halo: 0.45 },
  fairyLights: { paint: fairyLightsDesign, halo: 0.4 },
  baubles: { paint: baublesDesign, halo: 0.45 },
  wreath: { paint: wreathDesign, halo: 0.35 },
  bokeh: { paint: bokehDesign, halo: 0.6 },
  pongalPot: { paint: pongalPotDesign, halo: 0.35 },
  kolam: { paint: kolamDesign, halo: 0.3 },
  kites: { paint: kitesDesign, halo: 0.45 },
  rays: { paint: raysDesign, halo: 0.45 },
  rakhi: { paint: rakhiDesign, halo: 0.35 },
  hearts: { paint: heartsDesign, halo: 0.6 },
  modak: { paint: modakDesign, halo: 0.3 },
  lotus: { paint: lotusDesign, halo: 0.35 },
  dandiya: { paint: dandiyaDesign, halo: 0.45 },
  alpona: { paint: alponaDesign, halo: 0.3 },
  pookalam: { paint: pookalamDesign, halo: 0.35 },
  kasavu: { paint: kasavuDesign, halo: 0.25 },
  balloons: { paint: balloonsDesign, halo: 0.45 },
  cake: { paint: cakeDesign, halo: 0.4 },
  sunrise: { paint: sunriseDesign, halo: 0.45 },
  chai: { paint: chaiDesign, halo: 0.3 },
  moonlit: { paint: moonlitDesign, halo: 0.35 },
};
