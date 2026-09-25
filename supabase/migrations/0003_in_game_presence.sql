-- A fourth presence state, so friends can tell "around" from "mid-match".
--
-- Reported by the client through the same heartbeat as the others rather than
-- derived from lobby rows. Deriving it would look tidier, but nothing marks a
-- match finished yet, so a derived status would stick on IN_GAME forever. A
-- heartbeat ages out on its own: quit, crash or lose signal and the existing
-- staleness rule returns the player to OFFLINE with no extra bookkeeping.
--
-- IN_GAME counts as present everywhere OFFLINE is the only absent state, so
-- effective_presence and the friend ordering need no changes: they pass any
-- non-stale status straight through.
--
-- Separate migration because ALTER TYPE ... ADD VALUE cannot share a
-- transaction with statements that use the new value.

alter type public.presence_status add value if not exists 'IN_GAME';
