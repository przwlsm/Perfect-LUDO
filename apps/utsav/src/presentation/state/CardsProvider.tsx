import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { parseSavedCards, upsertCard, type CardSpec, type SavedCard } from '@/domain/entities/Card';
import { photos, storage } from '@/config/container';

const KEY = 'utsav.cards.v1';

interface CardsValue {
  readonly cards: readonly SavedCard[];
  readonly loaded: boolean;
  /** Saves (or updates) a card and returns its id. */
  save(spec: CardSpec, id?: string, sent?: boolean): string;
  remove(id: string): void;
  byId(id: string): SavedCard | undefined;
}

const Ctx = createContext<CardsValue | null>(null);

function newId(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * In a browser a picked photo is a data: or blob: address that is huge or
 * gone after a reload, so stored cards keep their words but not the photo.
 */
function storable(card: SavedCard): SavedCard {
  const uri = card.spec.photo?.uri ?? '';
  if (Platform.OS === 'web' && (uri.startsWith('data:') || uri.startsWith('blob:'))) {
    return { ...card, spec: { ...card.spec, photo: null } };
  }
  return card;
}

/** "My cards": every card made or sent, newest first, on this phone only. */
export function CardsProvider({ children }: PropsWithChildren) {
  const [cards, setCards] = useState<readonly SavedCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(cards);

  useEffect(() => {
    let live = true;
    void storage
      .getItem(KEY)
      .catch(() => null)
      .then((raw) => {
        if (!live) return;
        latest.current = parseSavedCards(raw);
        setCards(latest.current);
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const commit = useCallback((next: readonly SavedCard[]) => {
    const before = latest.current;
    latest.current = next;
    setCards(next);
    void storage.setItem(KEY, JSON.stringify(next.map(storable))).catch(() => undefined);
    // Photos no card uses any more are deleted from the app's folder.
    const used = new Set(next.map((c) => c.spec.photo?.uri).filter(Boolean));
    for (const c of before) {
      const uri = c.spec.photo?.uri;
      if (uri && !used.has(uri)) void photos.discard(uri);
    }
  }, []);

  const value = useMemo<CardsValue>(
    () => ({
      cards,
      loaded,
      save(spec, id, sent = false) {
        const cardId = id ?? newId();
        commit(upsertCard(latest.current, cardId, spec, Date.now(), sent));
        return cardId;
      },
      remove(id) {
        commit(latest.current.filter((c) => c.id !== id));
      },
      byId: (id) => latest.current.find((c) => c.id === id),
    }),
    [cards, loaded, commit],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCards(): CardsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCards must be used inside CardsProvider');
  return v;
}
