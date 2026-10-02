import { useCallback, useEffect, useRef, useState } from 'react';
import { reactionChannel } from '@/config/container';
import {
  botReaction,
  botReply,
  tableMoment,
  type GameState,
  type PlayerColor,
  type Reaction,
  type ReactionRoom,
} from '@/domain';

export interface ReactionBubble {
  readonly id: number;
  readonly color: PlayerColor;
  readonly emoji: Reaction;
}

const BUBBLE_MS = 2600;
const BOT_GAP_MS = 2500;

/** The emoji bubbles currently floating over the table, newest last. */
export function useReactionBubbles() {
  const [bubbles, setBubbles] = useState<readonly ReactionBubble[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const show = useCallback((color: PlayerColor, emoji: Reaction) => {
    seq.current += 1;
    const id = seq.current;
    // One bubble per seat: a new emoji replaces that seat's last one.
    setBubbles((list) =>
      [...list.filter((b) => b.color !== color), { id, color, emoji }].slice(-3),
    );
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setBubbles((list) => list.filter((b) => b.id !== id));
    }, BUBBLE_MS);
    timers.current.add(timer);
  }, []);

  return { bubbles, show };
}

/**
 * Computer seats react to captures, sixes and wins, and sometimes answer the
 * player's emoji. Returns the function that hands them the player's emoji.
 */
export function useBotReactions(
  state: GameState | null,
  isBot: (color: PlayerColor) => boolean,
  show: (color: PlayerColor, emoji: Reaction) => void,
  enabled: boolean,
) {
  const previous = useRef(state);
  const lastAt = useRef(0);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  const isBotRef = useRef(isBot);
  useEffect(() => {
    isBotRef.current = isBot;
  }, [isBot]);

  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    if (!enabled || !before || !state) return;
    const moment = tableMoment(before, state);
    if (!moment || Date.now() - lastAt.current < BOT_GAP_MS) return;
    const reaction = botReaction(moment, isBotRef.current, Math.random(), Math.random());
    if (!reaction) return;
    lastAt.current = Date.now();
    setTimeout(() => {
      if (alive.current) show(reaction.color, reaction.emoji);
    }, 450);
  }, [state, enabled, show]);

  return useCallback(
    (sent: Reaction) => {
      if (!enabled || !state) return;
      const bots = state.players.map((p) => p.color).filter((c) => isBotRef.current(c));
      const answer = botReply(sent, Math.random(), Math.random());
      if (!answer || bots.length === 0) return;
      const who = bots[Math.floor(Math.random() * bots.length)] as PlayerColor;
      lastAt.current = Date.now();
      setTimeout(() => {
        if (alive.current) show(who, answer);
      }, 1300);
    },
    [enabled, state, show],
  );
}

/**
 * Emoji between the players of one online match. Incoming reactions are
 * shown on the sender's seat; `send` shows yours at once and broadcasts it.
 */
export function useOnlineReactions(
  matchId: string | null,
  mySeat: number | null,
  colorOfSeat: (seat: number) => PlayerColor | null,
  show: (color: PlayerColor, emoji: Reaction) => void,
) {
  const room = useRef<ReactionRoom | null>(null);
  const colorRef = useRef(colorOfSeat);
  const seatRef = useRef(mySeat);
  useEffect(() => {
    colorRef.current = colorOfSeat;
    seatRef.current = mySeat;
  }, [colorOfSeat, mySeat]);

  useEffect(() => {
    if (!reactionChannel || !matchId) return;
    const joined = reactionChannel.join(matchId, (message) => {
      if (message.seat === seatRef.current) return;
      const color = colorRef.current(message.seat);
      if (color) show(color, message.emoji);
    });
    room.current = joined;
    return () => {
      joined.leave();
      room.current = null;
    };
  }, [matchId, show]);

  return useCallback(
    (emoji: Reaction) => {
      const seat = seatRef.current;
      if (seat === null) return;
      const color = colorRef.current(seat);
      if (color) show(color, emoji);
      room.current?.send({ seat, emoji });
    },
    [show],
  );
}
