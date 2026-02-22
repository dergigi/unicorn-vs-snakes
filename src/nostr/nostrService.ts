import { ExtensionSigner } from "applesauce-signers/signers";
import { EventFactory } from "applesauce-core";
import { RelayPool } from "applesauce-relay";
import { npubEncode } from "nostr-tools/nip19";
import { NOSTR_RELAYS } from "../config/gameConfig";
import { ScoreBlueprint, type ScoreData } from "./scoreBlueprint";

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
