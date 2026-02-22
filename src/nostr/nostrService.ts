import { ExtensionSigner } from "applesauce-signers/signers";
import { EventFactory } from "applesauce-core";
import { RelayPool } from "applesauce-relay";
import { npubEncode } from "applesauce-core/helpers/pointers";
import { type NostrEvent } from "applesauce-core/helpers/event";
import { lastValueFrom, toArray } from "rxjs";
import { NOSTR_RELAYS, NOSTR_KIND, NOSTR_HASHTAG, NOSTR_SCORE_VERSION, type Difficulty } from "../config/gameConfig";
import { ScoreBlueprint, type ScoreData } from "./scoreBlueprint";

export interface LeaderboardEntry {
  pubkey: string;
  npub: string;
  totalMs: number;
  sparkles: number;
  percent100: boolean;
  createdAt: number;
}

export interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
}

const STORAGE_KEY = "nostr-pubkey";

class NostrService {
  private static instance: NostrService;

  private signer: ExtensionSigner | null = null;
  private factory: EventFactory | null = null;
  private pool: RelayPool;
  private pubkey: string | null = null;
  private profileCache = new Map<string, NostrProfile>();

  private constructor() {
    this.pool = new RelayPool();
    this.restoreSession();
  }

  static getInstance(): NostrService {
    if (!NostrService.instance) {
      NostrService.instance = new NostrService();
    }
    return NostrService.instance;
  }

  isExtensionAvailable(): boolean {
    return typeof window !== "undefined" && !!window.nostr;
  }

  async login(): Promise<string> {
    if (!this.isExtensionAvailable()) {
      throw new Error("No Nostr extension found");
    }

    this.signer = new ExtensionSigner();
    this.pubkey = await this.signer.getPublicKey();
    this.factory = new EventFactory({ signer: this.signer });

    localStorage.setItem(STORAGE_KEY, this.pubkey);
    return this.pubkey;
  }

  logout(): void {
    this.signer = null;
    this.factory = null;
    this.pubkey = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  isLoggedIn(): boolean {
    return this.pubkey !== null && this.signer !== null;
  }

  getPubkey(): string | null {
    return this.pubkey;
  }

  getNpub(): string | null {
    if (!this.pubkey) return null;
    return npubEncode(this.pubkey);
  }

  async publishScore(data: ScoreData): Promise<boolean> {
    if (!this.factory || !this.signer) {
      throw new Error("Not logged in");
    }

    const template = await this.factory.create(ScoreBlueprint, data);
    const signed = await this.factory.sign(template);

    const results = await this.pool.publish(NOSTR_RELAYS, signed);
    return results.some((r) => r.ok);
  }

  async fetchTopScores(difficulty: Difficulty, limit = 5): Promise<LeaderboardEntry[]> {
    const filter = {
      kinds: [NOSTR_KIND],
      "#t": [NOSTR_HASHTAG],
    };

    const events = await lastValueFrom(
      this.pool.request(NOSTR_RELAYS, filter).pipe(toArray()),
      { defaultValue: [] as NostrEvent[] },
    );

    const best = new Map<string, LeaderboardEntry>();
    for (const ev of events) {
      try {
        const evDifficulty = ev.tags.find(t => t[0] === "difficulty")?.[1];
        if (evDifficulty !== difficulty) continue;
        const data = JSON.parse(ev.content);
        if (data.version !== NOSTR_SCORE_VERSION) continue;
        if (data.cheated) continue;
        if (typeof data.totalMs !== "number" || data.totalMs <= 0) continue;
        const prev = best.get(ev.pubkey);
        if (prev && prev.totalMs <= data.totalMs) continue;
        best.set(ev.pubkey, {
          pubkey: ev.pubkey,
          npub: npubEncode(ev.pubkey),
          totalMs: data.totalMs,
          sparkles: data.sparkles ?? 0,
          percent100: data.percent100 ?? false,
          createdAt: ev.created_at,
        });
      } catch {
        continue;
      }
    }

    return [...best.values()].sort((a, b) => a.totalMs - b.totalMs).slice(0, limit);
  }

  async fetchProfiles(pubkeys: string[]): Promise<Map<string, NostrProfile>> {
    const uncached = pubkeys.filter(pk => !this.profileCache.has(pk));

    if (uncached.length > 0) {
      const filter = { kinds: [0 as number], authors: uncached };

      const events = await lastValueFrom(
        this.pool.request(NOSTR_RELAYS, filter).pipe(toArray()),
        { defaultValue: [] as NostrEvent[] },
      );

      const latest = new Map<string, NostrEvent>();
      for (const ev of events) {
        const prev = latest.get(ev.pubkey);
        if (!prev || ev.created_at > prev.created_at) {
          latest.set(ev.pubkey, ev);
        }
      }

      for (const [pk, ev] of latest) {
        try {
          const profile = JSON.parse(ev.content) as NostrProfile;
          this.profileCache.set(pk, profile);
        } catch {
          /* skip malformed profiles */
        }
      }
    }

    const result = new Map<string, NostrProfile>();
    for (const pk of pubkeys) {
      const cached = this.profileCache.get(pk);
      if (cached) result.set(pk, cached);
    }
    return result;
  }

  getDisplayName(pubkey: string): string {
    const profile = this.profileCache.get(pubkey);
    const name = profile?.display_name || profile?.name;
    if (name) return name;
    return this.truncateNpub(pubkey);
  }

  private truncateNpub(pubkey: string): string {
    const npub = npubEncode(pubkey);
    return npub.slice(0, 10) + "..." + npub.slice(-4);
  }

  private restoreSession(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && this.isExtensionAvailable()) {
      this.pubkey = stored;
      this.signer = new ExtensionSigner();
      this.factory = new EventFactory({ signer: this.signer });
    }
  }
}

export const nostrService = NostrService.getInstance();
