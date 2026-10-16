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
import { afterAnswer, dueKeys, grade, newCard, type Grade } from '@/application/review/srs';
import { phraseByKey } from '@/domain/content/catalogue';
import type { LangId, SceneId } from '@/domain/content/types';
import {
  dayIndex,
  markPractised,
  markScene,
  NO_PROGRESS,
  parseProgress,
  toggleFavourite,
  touchDay,
  type Progress,
  type SceneRecord,
} from '@/domain/entities/Progress';
import { storage } from '@/config/container';

const KEY = 'speaklocal.progress.v1';

interface ProgressValue {
  readonly progress: Progress;
  readonly loaded: boolean;
  scene(lang: LangId, scene: SceneId, patch: Partial<SceneRecord>): void;
  opened(scene: SceneId): void;
  practised(keys: readonly string[]): void;
  /** Records a quiz answer: it counts, and a miss joins review. */
  answer(key: string, correct: boolean): void;
  favourite(key: string): void;
  /** Puts a phrase into review (due today); no-op when it already is. */
  addToReview(key: string): void;
  inReview(key: string): boolean;
  review(key: string, g: Grade): void;
  /** Review keys due today for a language, oldest first. */
  due(lang: LangId): string[];
}

const Ctx = createContext<ProgressValue | null>(null);

export function ProgressProvider({ children }: PropsWithChildren) {
  const [progress, setProgress] = useState<Progress>(NO_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(progress);

  useEffect(() => {
    let live = true;
    void storage
      .getItem(KEY)
      .catch(() => null)
      .then((raw) => {
        if (!live) return;
        latest.current = parseProgress(raw);
        setProgress(latest.current);
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const commit = useCallback((next: Progress) => {
    if (next === latest.current) return;
    latest.current = next;
    setProgress(next);
    void storage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const value = useMemo<ProgressValue>(() => {
    const today = () => dayIndex(new Date());
    return {
      progress,
      loaded,
      scene: (lang, scene, patch) =>
        commit(markScene(latest.current, lang, scene, patch, new Date())),
      opened: (scene) => {
        if (latest.current.lastScene !== scene) commit({ ...latest.current, lastScene: scene });
      },
      practised: (keys) => commit(markPractised(latest.current, keys, new Date())),
      answer: (key, correct) => {
        const p = latest.current;
        commit(
          touchDay(
            {
              ...p,
              answered: p.answered + 1,
              correct: p.correct + (correct ? 1 : 0),
              cards: afterAnswer(p.cards, key, correct, today()),
            },
            new Date(),
          ),
        );
      },
      favourite: (key) => commit(toggleFavourite(latest.current, key)),
      addToReview: (key) => {
        const p = latest.current;
        if (p.cards[key]) return;
        commit({ ...p, cards: { ...p.cards, [key]: newCard(today()) } });
      },
      inReview: (key) => !!progress.cards[key],
      review: (key, g) => {
        const p = latest.current;
        const card = p.cards[key] ?? newCard(today());
        commit(
          touchDay({ ...p, cards: { ...p.cards, [key]: grade(card, g, today()) } }, new Date()),
        );
      },
      due: (lang) =>
        dueKeys(progress.cards, today()).filter(
          (k) => k.startsWith(`${lang}:`) && phraseByKey(k) !== null,
        ),
    };
  }, [progress, loaded, commit]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProgress must be used inside ProgressProvider');
  return v;
}
