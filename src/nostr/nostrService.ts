import { ExtensionSigner } from "applesauce-signers/signers";
import { EventFactory } from "applesauce-core";
import { RelayPool } from "applesauce-relay";
import { npubEncode } from "applesauce-core/helpers/pointers";
import { type NostrEvent } from "applesauce-core/helpers/event";
import { type Subscription } from "rxjs";
import { NOSTR_RELAYS, NOSTR_KIND, NOSTR_GAME_TAG, NOSTR_SCORE_VERSION, type Difficulty } from "../config/gameConfig";
import { ScoreBlueprint, type ScoreData } from "./scoreBlueprint";

export interface LeaderboardEntry {
  pubkey: string;
  npub: string;
  totalMs: number;
  sparkles: number;
  percent100: boolean;
  createdAt: number;
}

const STORAGE_KEY = "nostr-pubkey";

class NostrService {
  private static instance: NostrService;

  private signer: ExtensionSigner | null = null;
  private factory: EventFactory | null = null;
  private pool: RelayPool;
  private pubkey: string | null = null;

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

  getTruncatedNpub(): string | null {
    const npub = this.getNpub();
    if (!npub) return null;
    return npub.slice(0, 10) + "..." + npub.slice(-4);
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
      "#d": [NOSTR_GAME_TAG],
    };

    const events = await new Promise<NostrEvent[]>((resolve) => {
      const collected: NostrEvent[] = [];
      let sub: Subscription | undefined;
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        sub?.unsubscribe();
        resolve(collected);
      };
      const timer = setTimeout(done, 8000);
      sub = this.pool.request(NOSTR_RELAYS, filter).subscribe({
        next: (ev) => collected.push(ev),
        complete: done,
        error: () => done(),
      });
    });

    const entries: LeaderboardEntry[] = [];
    for (const ev of events) {
      try {
        const evDifficulty = ev.tags.find(t => t[0] === "difficulty")?.[1];
        if (evDifficulty !== difficulty) continue;
        const data = JSON.parse(ev.content);
        if (data.version !== NOSTR_SCORE_VERSION) continue;
        if (data.cheated) continue;
        if (typeof data.totalMs !== "number" || data.totalMs <= 0) continue;
        entries.push({
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

    entries.sort((a, b) => a.totalMs - b.totalMs);

    const seen = new Set<string>();
    const unique: LeaderboardEntry[] = [];
    for (const entry of entries) {
      if (seen.has(entry.pubkey)) continue;
      seen.add(entry.pubkey);
      unique.push(entry);
      if (unique.length >= limit) break;
    }

    return unique;
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
