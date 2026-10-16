import type { ThemeId } from '@/domain/entities/Theme';

/** Colours for one light (stormy dusk or monsoon morning) of a board. */
export interface GroundLight {
  /** The hillside behind the board, top to bottom. */
  readonly hill: readonly [string, string];
  /** Terrace steps: alternate rows take one tint or the other. */
  readonly terrace: readonly [string, string];
  /** The darker lip at the foot of each terrace and the frame around the board. */
  readonly lip: string;
  readonly frame: readonly [string, string];
  /** Rain falling over the board. */
  readonly rain: string;
}

/** How the board looks in one valley. Rules never change; only stone, earth and water do. */
export interface BoardLook {
  readonly id: ThemeId;
  readonly dusk: GroundLight;
  readonly morning: GroundLight;
  /** Stone channel walls: lit face and shadow. */
  readonly stone: readonly [string, string];
  /** The channel bed when dry. */
  readonly bed: string;
  /** Rain water (paddies) and temple-tank water (lotus ponds). */
  readonly rainWater: string;
  readonly tankWater: string;
  /** Both waters mixed: murky. */
  readonly mud: string;
  /** Boulders and the moss on them. */
  readonly rock: readonly [string, string];
  readonly moss: string;
  /** Paddy soil when dry, and the young rice. */
  readonly soil: string;
  readonly rice: readonly [string, string];
  readonly lotus: string;
  /** Something growing between the stones, drawn on rocks: grass, palms, tea bushes, cactus, fireflies. */
  readonly flora: 'grass' | 'palm' | 'tea' | 'cactus' | 'firefly';
  /** True when the board stays a night scene in both lights. */
  readonly alwaysNight?: boolean;
}

export const LOOKS: Readonly<Record<ThemeId, BoardLook>> = {
  terraces: {
    id: 'terraces',
    dusk: {
      hill: ['#1d3a2c', '#24452f'],
      terrace: ['#2f5733', '#355f37'],
      lip: '#1b3220',
      frame: ['#4a3b2a', '#2c2318'],
      rain: 'rgba(214, 230, 240, 0.55)',
    },
    morning: {
      hill: ['#8cc56c', '#79b85d'],
      terrace: ['#93c96f', '#86bf63'],
      lip: '#5e9447',
      frame: ['#9a7a52', '#6f5636'],
      rain: 'rgba(60, 110, 140, 0.4)',
    },
    stone: ['#c9c4b2', '#7b7768'],
    bed: '#5a4a38',
    rainWater: '#5cb8ff',
    tankWater: '#ff86b4',
    mud: '#8a6e4b',
    rock: ['#a7a395', '#5f5c52'],
    moss: '#6fa64a',
    soil: '#6b5236',
    rice: ['#b7ec6c', '#5fae3a'],
    lotus: '#ff9fc4',
    flora: 'grass',
  },
  backwaters: {
    id: 'backwaters',
    dusk: {
      hill: ['#123a36', '#0f302d'],
      terrace: ['#1f4d3d', '#245542'],
      lip: '#0f2a22',
      frame: ['#5a3322', '#331b11'],
      rain: 'rgba(200, 236, 236, 0.55)',
    },
    morning: {
      hill: ['#4fae7d', '#3d9b6c'],
      terrace: ['#5fbb84', '#53b079'],
      lip: '#2f7d54',
      frame: ['#9b5a3c', '#6c3a24'],
      rain: 'rgba(40, 110, 110, 0.38)',
    },
    stone: ['#c9805f', '#7a3e27'],
    bed: '#4a2a1c',
    rainWater: '#3fd6cb',
    tankWater: '#ff8fb0',
    mud: '#7d6145',
    rock: ['#8f6b55', '#4d362a'],
    moss: '#4caf6e',
    soil: '#5a3b26',
    rice: ['#c2f07a', '#4fa83a'],
    lotus: '#ffa3c2',
    flora: 'palm',
  },
  tea: {
    id: 'tea',
    dusk: {
      hill: ['#18342a', '#1c3b2e'],
      terrace: ['#244a33', '#1f4330'],
      lip: '#122a1c',
      frame: ['#3f4a3a', '#232b21'],
      rain: 'rgba(220, 235, 230, 0.5)',
    },
    morning: {
      hill: ['#6fae6a', '#5d9f5a'],
      terrace: ['#77b46e', '#68a862'],
      lip: '#447c3f',
      frame: ['#8c8a6a', '#5f5d45'],
      rain: 'rgba(70, 110, 100, 0.36)',
    },
    stone: ['#e3dccb', '#8f8775'],
    bed: '#4f4432',
    rainWater: '#7fd4ee',
    tankWater: '#ff94b9',
    mud: '#857155',
    rock: ['#b9b4a2', '#6a665a'],
    moss: '#3f8a46',
    soil: '#5d4a34',
    rice: ['#c5ef86', '#5aa246'],
    lotus: '#ffa6c6',
    flora: 'tea',
  },
  stepwell: {
    id: 'stepwell',
    dusk: {
      hill: ['#4a3420', '#3a2817'],
      terrace: ['#6b4c2c', '#634628'],
      lip: '#3a2814',
      frame: ['#7a5432', '#4a311b'],
      rain: 'rgba(240, 225, 205, 0.5)',
    },
    morning: {
      hill: ['#e6c48a', '#d9b276'],
      terrace: ['#e8c890', '#e0bd82'],
      lip: '#b98b52',
      frame: ['#c48d4f', '#8f6131'],
      rain: 'rgba(120, 90, 50, 0.32)',
    },
    stone: ['#f2d8a6', '#a8773f'],
    bed: '#6a4826',
    rainWater: '#26c6cf',
    tankWater: '#ff7fa6',
    mud: '#8c6a43',
    rock: ['#c99a62', '#7a5530'],
    moss: '#8aa04a',
    soil: '#7a5530',
    rice: ['#c9ec7a', '#6aa83c'],
    lotus: '#ff9bbd',
    flora: 'cactus',
  },
  nightrain: {
    id: 'nightrain',
    alwaysNight: true,
    dusk: {
      hill: ['#121735', '#191f45'],
      terrace: ['#1d2450', '#222a59'],
      lip: '#10153a',
      frame: ['#2c3366', '#151a3a'],
      rain: 'rgba(190, 215, 255, 0.6)',
    },
    morning: {
      hill: ['#1b2250', '#232b5e'],
      terrace: ['#262f66', '#2b3570'],
      lip: '#161c46',
      frame: ['#3a4380', '#1d2350'],
      rain: 'rgba(200, 220, 255, 0.6)',
    },
    stone: ['#8d97c2', '#434b78'],
    bed: '#141938',
    rainWater: '#6ff0ff',
    tankWater: '#ff8ee0',
    mud: '#7a6a8a',
    rock: ['#59618f', '#2a3058'],
    moss: '#4d7a8a',
    soil: '#2a2a4a',
    rice: ['#b9ff8a', '#4fbf6a'],
    lotus: '#ffa4ea',
    flora: 'firefly',
  },
};

/** The ground for the app's current light. */
export function groundOf(look: BoardLook, scheme: 'dusk' | 'morning'): GroundLight {
  return scheme === 'dusk' ? look.dusk : look.morning;
}

/** The colour of a part's water bits: 1 rain, 2 temple tank, 3 both (mud). */
export function waterColour(look: BoardLook, bits: number): string {
  return bits === 3 ? look.mud : bits === 2 ? look.tankWater : look.rainWater;
}
