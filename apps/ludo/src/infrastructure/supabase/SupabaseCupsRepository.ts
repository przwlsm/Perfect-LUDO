import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseCupBracket,
  parseCupGameLength,
  parseCupsView,
  type CupBracket,
  type CupGameLength,
  type CupsView,
  type ICupsRepository,
} from '@/domain';
import { rpc } from './supabaseRpc';

export class SupabaseCupsRepository implements ICupsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<CupsView> {
    return parseCupsView(await rpc(this.client, 'get_cups'));
  }

  async join(cupId: string): Promise<CupBracket> {
    return parseCupBracket(await rpc(this.client, 'join_cup', { p_cup_id: cupId }));
  }

  async leave(bracketId: string): Promise<void> {
    await rpc(this.client, 'leave_cup', { p_bracket: bracketId });
  }

  async createPrivate(cupId: string): Promise<CupBracket> {
    return parseCupBracket(await rpc(this.client, 'create_private_cup', { p_cup_id: cupId }));
  }

  async joinByCode(code: string): Promise<CupBracket> {
    return parseCupBracket(await rpc(this.client, 'join_cup_by_code', { p_code: code }));
  }

  async startPrivate(bracketId: string): Promise<CupBracket> {
    return parseCupBracket(await rpc(this.client, 'start_private_cup', { p_bracket: bracketId }));
  }

  async get(bracketId: string): Promise<CupBracket> {
    return parseCupBracket(await rpc(this.client, 'get_cup_bracket', { p_bracket: bracketId }));
  }

  async gameLength(): Promise<CupGameLength> {
    return parseCupGameLength(await rpc(this.client, 'cup_game_length'));
  }
}
