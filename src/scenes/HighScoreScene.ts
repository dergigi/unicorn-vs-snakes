import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, DIFFICULTY_LABELS, type Difficulty } from "../config/gameConfig";
import { nostrService, type LeaderboardEntry } from "../nostr/nostrService";
import { formatTime } from "../utils/formatTime";

type TabFilter = "all" | Difficulty;

interface HighScoreData {
  difficulty?: Difficulty;
  returnTo: "MenuScene" | "PauseScene";
  pauseData?: Record<string, unknown>;
}

interface AnnotatedEntry extends LeaderboardEntry {
  difficulty: Difficulty;
}

const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard", "insane"];

const TAB_COLORS: Record<Difficulty, { active: string; badge: string }> = {
  easy:   { active: "#6fdc7f", badge: "#6fdc7f" },
  normal: { active: "#ff7fd9", badge: "#ff7fd9" },
  hard:   { active: "#ffaa5b", badge: "#ffaa5b" },
  insane: { active: "#ff5f6a", badge: "#ff5f6a" },
};

const BADGE_LABELS: Record<Difficulty, string> = {
  easy: "E",
  normal: "N",
  hard: "H",
  insane: "I",
};

const TOTAL_ROWS = 10;

export class HighScoreScene extends Phaser.Scene {
  private returnTo!: string;
  private pauseData?: Record<string, unknown>;
  private activeTab: TabFilter = "all";
  private scoreCache = new Map<Difficulty, LeaderboardEntry[]>();
  private tableContainer!: Phaser.GameObjects.Container;
  private tabTexts: { filter: TabFilter; text: Phaser.GameObjects.Text }[] = [];
  private loadingLabel!: Phaser.GameObjects.Text;
  private loaded = false;

  constructor() {
    super("HighScoreScene");
  }

  create(data: HighScoreData): void {
    this.returnTo = data.returnTo ?? "MenuScene";
    this.pauseData = data.pauseData;
    this.activeTab = "all";
    this.loaded = false;
    this.scoreCache.clear();
    this.tabTexts = [];

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d1336).setOrigin(0, 0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.35, 0x2a1040, 0.4).setOrigin(0, 0);

    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 38, "HIGH SCORES", {
      fontFamily: "\"Press Start 2P\", \"Courier New\", monospace",
      fontSize: "28px",
      color: "#ffe0f6",
      stroke: "#24133d",
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.buildTabs(cx);

    this.tableContainer = this.add.container(0, 0);

    this.loadingLabel = this.add.text(cx, 260, "Loading...", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#a090c0",
      stroke: "#2a1040",
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.buildBackButton(cx);
    this.fetchAllScores();
  }

  private buildTabs(cx: number): void {
    const tabs: { filter: TabFilter; label: string }[] = [
      { filter: "all", label: "ALL" },
      { filter: "easy", label: "EASY" },
      { filter: "normal", label: "NORMAL" },
      { filter: "hard", label: "HARD" },
      { filter: "insane", label: "INSANE-O" },
    ];

    const tabW = 140;
    const totalW = tabs.length * tabW;
    const startX = cx - totalW / 2 + tabW / 2;
    const tabY = 86;

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const x = startX + i * tabW;

      const text = this.add.text(x, tabY, tab.label, {
        fontFamily: "\"Press Start 2P\", \"Courier New\", monospace",
        fontSize: "11px",
        color: "#6a5a80",
        stroke: "#1d1336",
        strokeThickness: 3,
      }).setOrigin(0.5);

      text.setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => this.selectTab(tab.filter));
      text.on("pointerover", () => {
        if (this.activeTab !== tab.filter) text.setColor("#ffffff");
      });
      text.on("pointerout", () => {
        if (this.activeTab !== tab.filter) text.setColor("#6a5a80");
      });

      this.tabTexts.push({ filter: tab.filter, text });
    }

    this.refreshTabStyles();
  }

  private selectTab(filter: TabFilter): void {
    this.activeTab = filter;
    this.refreshTabStyles();
    if (this.loaded) this.renderTable();
  }

  private refreshTabStyles(): void {
    for (const { filter, text } of this.tabTexts) {
      if (filter === this.activeTab) {
        const color = filter === "all" ? "#ffffff" : TAB_COLORS[filter].active;
        text.setColor(color);
        text.setScale(1.1);
      } else {
        text.setColor("#6a5a80");
        text.setScale(1);
      }
    }
  }

  private async fetchAllScores(): Promise<void> {
    try {
      const results = await Promise.all(
        DIFFICULTIES.map(d => nostrService.fetchTopScores(d, TOTAL_ROWS))
      );
      if (!this.scene.isActive()) return;

      for (let i = 0; i < DIFFICULTIES.length; i++) {
        this.scoreCache.set(DIFFICULTIES[i], results[i]);
      }

      const allPubkeys = new Set<string>();
      for (const entries of results) {
        for (const e of entries) allPubkeys.add(e.pubkey);
      }

      this.loaded = true;
      this.loadingLabel.destroy();
      this.renderTable();

      if (allPubkeys.size > 0) {
        nostrService.fetchProfiles([...allPubkeys]).then(() => {
          if (!this.scene.isActive()) return;
          this.renderTable();
        }).catch(() => {});
      }
    } catch {
      if (!this.scene.isActive()) return;
      this.loadingLabel.setText("Could not load scores");
      this.loadingLabel.setColor("#ff8888");
    }
  }

  private getEntries(): AnnotatedEntry[] {
    if (this.activeTab === "all") {
      const merged: AnnotatedEntry[] = [];
      for (const diff of DIFFICULTIES) {
        const entries = this.scoreCache.get(diff) ?? [];
        for (const e of entries) {
          merged.push({ ...e, difficulty: diff });
        }
      }
      merged.sort((a, b) => a.totalMs - b.totalMs);

      const seen = new Set<string>();
      const deduped: AnnotatedEntry[] = [];
      for (const entry of merged) {
        if (!seen.has(entry.pubkey)) {
          seen.add(entry.pubkey);
          deduped.push(entry);
        }
        if (deduped.length >= TOTAL_ROWS) break;
      }
      return deduped;
    }

    const entries = this.scoreCache.get(this.activeTab) ?? [];
    return entries.slice(0, TOTAL_ROWS).map(e => ({ ...e, difficulty: this.activeTab as Difficulty }));
  }

  private renderTable(): void {
    this.tableContainer.removeAll(true);

    const entries = this.getEntries();
    const cx = GAME_WIDTH / 2;
    const panelW = 600;
    const panelX = cx - panelW / 2;
    const rowH = 30;
    const tableTop = 118;
    const showBadge = this.activeTab === "all";

    const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#8a7fb0",
      stroke: "#1d1336",
      strokeThickness: 2,
    };

    const rankX = panelX + 16;
    const badgeX = panelX + 56;
    const nameX = showBadge ? panelX + 100 : panelX + 66;
    const timeX = panelX + panelW - 16;

    const hRank = this.add.text(rankX, tableTop, "#", headerStyle).setOrigin(0, 0.5);
    const hName = this.add.text(nameX, tableTop, "Name", headerStyle).setOrigin(0, 0.5);
    const hTime = this.add.text(timeX, tableTop, "Time", headerStyle).setOrigin(1, 0.5);
    this.tableContainer.add([hRank, hName, hTime]);

    if (showBadge) {
      const hDiff = this.add.text(badgeX, tableTop, "Diff", headerStyle).setOrigin(0, 0.5);
      this.tableContainer.add(hDiff);
    }

    const rowTop = tableTop + 20;
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1040, 0.5);
    bg.fillRoundedRect(panelX, rowTop - 6, panelW, TOTAL_ROWS * rowH + 12, 8);
    this.tableContainer.add(bg);

    const rowStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#d8b8f0",
      stroke: "#2a1040",
      strokeThickness: 2,
    };
    const dimColor = "#6a5a80";
    const myPubkey = nostrService.getPubkey();

    for (let i = 0; i < TOTAL_ROWS; i++) {
      const entry = entries[i];
      const y = rowTop + i * rowH + rowH / 2;
      const rank = `${i + 1}.`;

      if (entry) {
        const isMe = entry.pubkey === myPubkey;
        const color = isMe ? "#ffb8e6" : rowStyle.color!;

        const rankText = this.add.text(rankX, y, rank, { ...rowStyle, color }).setOrigin(0, 0.5);
        const nameLabel = nostrService.getDisplayName(entry.pubkey);
        const nameText = this.add.text(nameX, y, nameLabel, { ...rowStyle, color }).setOrigin(0, 0.5);
        const timeText = this.add.text(timeX, y, formatTime(entry.totalMs), { ...rowStyle, color }).setOrigin(1, 0.5);
        this.tableContainer.add([rankText, nameText, timeText]);

        if (showBadge) {
          const badgeColor = TAB_COLORS[entry.difficulty].badge;
          const badgeLabel = BADGE_LABELS[entry.difficulty];
          const badge = this.add.text(badgeX, y, badgeLabel, {
            fontFamily: "\"Press Start 2P\", \"Courier New\", monospace",
            fontSize: "9px",
            color: badgeColor,
            stroke: "#1d1336",
            strokeThickness: 2,
          }).setOrigin(0, 0.5);
          this.tableContainer.add(badge);
        }
      } else {
        const rankText = this.add.text(rankX, y, rank, { ...rowStyle, color: dimColor }).setOrigin(0, 0.5);
        const nameText = this.add.text(nameX, y, "---", { ...rowStyle, color: dimColor }).setOrigin(0, 0.5);
        const timeText = this.add.text(timeX, y, "-:--.-", { ...rowStyle, color: dimColor }).setOrigin(1, 0.5);
        this.tableContainer.add([rankText, nameText, timeText]);

        if (showBadge) {
          const badge = this.add.text(badgeX, y, "-", {
            fontFamily: "\"Press Start 2P\", \"Courier New\", monospace",
            fontSize: "9px",
            color: dimColor,
            stroke: "#1d1336",
            strokeThickness: 2,
          }).setOrigin(0, 0.5);
          this.tableContainer.add(badge);
        }
      }
    }
  }

  private buildBackButton(cx: number): void {
    const btnY = GAME_HEIGHT - 42;
    const back = this.add.text(cx, btnY, "← Back", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#cccccc",
      stroke: "#24133d",
      strokeThickness: 4,
    }).setOrigin(0.5);

    back.setInteractive({ useHandCursor: true });
    back.on("pointerover", () => { back.setColor("#ffffff"); back.setScale(1.08); });
    back.on("pointerout", () => { back.setColor("#cccccc"); back.setScale(1); });
    back.on("pointerdown", () => this.goBack());

    this.input.keyboard?.on("keydown-ESC", () => this.goBack(), this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-ESC", undefined, this);
    });
  }

  private goBack(): void {
    if (this.returnTo === "PauseScene" && this.pauseData) {
      this.scene.start("PauseScene", this.pauseData);
    } else {
      this.scene.start("MenuScene");
    }
  }
}
