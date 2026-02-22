import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, LEVEL_COUNT, type Difficulty } from "../config/gameConfig";
import { formatTime } from "../utils/formatTime";
import { nostrService, type LeaderboardEntry } from "../nostr/nostrService";
import type { ScoreData } from "../nostr/scoreBlueprint";

interface WinData {
  totalSparkles?: number;
  totalApples?: number;
  totalPowerups?: number;
  difficulty?: Difficulty;
  levelTimes?: number[];
  menuTimeMs?: number;
  cheated?: boolean;
}

export class WinScene extends Phaser.Scene {
  constructor() {
    super("WinScene");
  }

  private computeMaxCollectibles(): { sparkles: number; apples: number; powerups: number } {
    let sparkles = 0;
    let apples = 0;
    let powerups = 0;
    for (let i = 1; i <= LEVEL_COUNT; i++) {
      const ld = this.cache.json.get(`level-${i}`);
      if (!ld) continue;
      sparkles += (ld.sparkles as unknown[])?.length ?? 0;
      apples += (ld.apples as unknown[])?.length ?? 0;
      if (ld.rainbowPowerup) powerups += 1;
      if (ld.bossMushroom) powerups += 1;
    }
    return { sparkles, apples, powerups };
  }

  create(data: WinData): void {
    const levelTimes = data.levelTimes ?? [];
    const menuTimeMs = data.menuTimeMs ?? 0;
    const totalMs = menuTimeMs + levelTimes.reduce((sum, t) => sum + t, 0);
    const difficulty = data.difficulty ?? "normal";
    const cx = GAME_WIDTH / 2;

    const max = this.computeMaxCollectibles();
    const collectedSparkles = data.totalSparkles ?? 0;
    const collectedApples = data.totalApples ?? 0;
    const collectedPowerups = data.totalPowerups ?? 0;
    const is100Percent =
      collectedSparkles >= max.sparkles &&
      collectedApples >= max.apples &&
      collectedPowerups >= max.powerups;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x3b1a4f).setOrigin(0, 0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.5, 0x5c2d6e, 0.6).setOrigin(0, 0);
    this.add.rectangle(0, GAME_HEIGHT * 0.5, GAME_WIDTH, GAME_HEIGHT * 0.5, 0x2a1040, 0.5).setOrigin(0, 0);

    this.add.ellipse(cx, 48, 500, 120, 0xff8fd3, 0.12);

    const rainbowColors = [0xff4b5e, 0xff8a3d, 0xffd95e, 0x7de86f, 0x66d8ff, 0x6f8dff, 0xd98cff];
    for (let i = 0; i < rainbowColors.length; i++) {
      this.add.ellipse(cx, -60 + i * 6, 700 - i * 30, 180 - i * 8, rainbowColors[i], 0.18);
    }

    this.spawnSparkles();

    this.add.text(cx, 42, "Yaaaay!", {
      fontFamily: "monospace",
      fontSize: "52px",
      color: "#ffe0f6",
      stroke: "#7b2f72",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(cx, 86, "Rainbow Kingdom is safe!", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffb8e6",
      stroke: "#3b1a4f",
      strokeThickness: 3
    }).setOrigin(0.5);

    const statsStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#d8b8f0",
      stroke: "#2a1040",
      strokeThickness: 2
    };

    const leftCx = GAME_WIDTH * 0.3;
    const rightCx = GAME_WIDTH * 0.72;

    this.add.text(leftCx, 118, `Sparkles: ${data.totalSparkles ?? 0}`, statsStyle).setOrigin(0.5);

    const allTimes: [string, number][] = [
      ["Level 0", menuTimeMs],
      ...levelTimes.map((t, i): [string, number] => [`Level ${i + 1}`, t])
    ];

    const tableTop = 146;
    const rowH = 18;
    const labelX = leftCx - 10;
    const valueX = leftCx + 10;

    for (let i = 0; i < allTimes.length; i++) {
      const [label, ms] = allTimes[i];
      const y = tableTop + i * rowH;
      this.add.text(labelX, y, label, statsStyle).setOrigin(1, 0.5);
      this.add.text(valueX, y, formatTime(ms), statsStyle).setOrigin(0, 0.5);
    }

    const totalY = tableTop + allTimes.length * rowH + 8;
    this.add.text(labelX, totalY, "Total", statsStyle).setOrigin(1, 0.5);
    this.add.text(valueX, totalY, formatTime(totalMs), statsStyle).setOrigin(0, 0.5);

    // Share dialog
    const shareText = is100Percent
      ? `I just had a 100% Unicorn vs Snakes run and beat it on ${difficulty} difficulty in ${formatTime(totalMs)}!!!`
      : `I just beat Unicorn vs Snakes on ${difficulty} difficulty in ${formatTime(totalMs)}!`;
    const displayText = is100Percent
      ? `I just had a 100% Unicorn vs Snakes run\nand beat it on ${difficulty} difficulty in ${formatTime(totalMs)}!!!`
      : `I just beat Unicorn vs Snakes\non ${difficulty} difficulty in ${formatTime(totalMs)}!`;

    const btnY = GAME_HEIGHT - 52;
    const portraitSize = 38;
    const leftPad = 60;
    const rightPad = 40;

    const measureText = this.add.text(0, 0, displayText, {
      fontFamily: "monospace",
      fontSize: "12px"
    });
    const dialogWidth = Math.ceil((leftPad + measureText.width + rightPad) * 1.2);
    const dialogHeight = 73;
    measureText.destroy();

    const dialogX = leftCx - dialogWidth / 2;
    const dialogY = totalY + 16;
    const portraitCenterX = dialogX + 32;
    const portraitCenterY = dialogY + dialogHeight / 2;

    const dialog = this.add.graphics();
    dialog.fillStyle(0x4a1850, 0.9);
    dialog.lineStyle(2, 0xffb8e6, 0.7);
    dialog.fillRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 12);
    dialog.strokeRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 12);

    this.add.sprite(portraitCenterX, portraitCenterY, "unicorn", 0)
      .setDisplaySize(portraitSize, portraitSize);

    this.add.text(dialogX + leftPad, portraitCenterY, displayText, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffe6f8",
      align: "left",
      stroke: "#2a0e30",
      strokeThickness: 3
    }).setOrigin(0, 0.5);

    const copyIcon = this.add.image(
      dialogX + dialogWidth - 18,
      dialogY + dialogHeight - 18,
      "copy-icon"
    ).setDisplaySize(28, 28).setOrigin(1, 1).setAlpha(0.7);
    copyIcon.setInteractive({ useHandCursor: true });
    copyIcon.on("pointerdown", () => {
      navigator.clipboard.writeText(shareText).then(() => {
        copyIcon.setTexture("clipboard-check");
        this.time.delayedCall(1500, () => copyIcon.setTexture("copy-icon"));
      });
    });

    if (nostrService.isLoggedIn()) {
      const scoreData: ScoreData = {
        difficulty,
        sparkles: collectedSparkles,
        apples: collectedApples,
        powerups: collectedPowerups,
        levelTimes,
        menuTimeMs,
        totalMs,
        percent100: is100Percent,
        cheated: data.cheated ?? false,
      };
      this.buildNostrButton(dialogX, dialogY + dialogHeight + 8, dialogWidth, scoreData);
    }

    // Leaderboard panel (right column)
    this.buildLeaderboard(rightCx, 110, difficulty, totalMs);

    // Play again button — anchored near bottom
    const again = this.add.rectangle(cx, btnY, 260, 50, 0xff8fd3);
    again.setStrokeStyle(3, 0xffffff);
    again.setInteractive({ useHandCursor: true });
    this.add.text(cx, btnY, "PLAY AGAIN", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#3b0a2e",
      stroke: "#ffcce8",
      strokeThickness: 2
    }).setOrigin(0.5);

    again.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }

  private buildNostrButton(x: number, y: number, width: number, scoreData: ScoreData): void {
    const btnH = 28;
    const btnCx = x + width / 2;
    const btnCy = y + btnH / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x6a2f80, 0.85);
    bg.lineStyle(1, 0xc88cff, 0.6);
    bg.fillRoundedRect(x, y, width, btnH, 8);
    bg.strokeRoundedRect(x, y, width, btnH, 8);

    const label = this.add.text(btnCx, btnCy, "Post to Nostr", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#e8d0ff",
      stroke: "#2a1040",
      strokeThickness: 2,
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(btnCx, btnCy, width, btnH, 0, 0);
    hitArea.setInteractive({ useHandCursor: true });

    let posting = false;
    hitArea.on("pointerover", () => {
      if (!posting) label.setColor("#ffffff");
    });
    hitArea.on("pointerout", () => {
      if (!posting) label.setColor("#e8d0ff");
    });

    hitArea.on("pointerdown", () => {
      if (posting) return;
      posting = true;
      label.setText("Signing...");
      label.setColor("#b8a0d8");

      nostrService.publishScore(scoreData).then((ok) => {
        if (ok) {
          label.setText("Posted!");
          label.setColor("#9fffb8");
          hitArea.disableInteractive();
        } else {
          label.setText("Relay error — tap to retry");
          label.setColor("#ff8888");
          posting = false;
        }
      }).catch(() => {
        label.setText("Failed — tap to retry");
        label.setColor("#ff8888");
        posting = false;
      });
    });
  }

  private buildLeaderboard(cx: number, top: number, difficulty: Difficulty, playerMs: number): void {
    const panelW = 280;
    const panelX = cx - panelW / 2;
    const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#ffe0f6",
      stroke: "#3b1a4f",
      strokeThickness: 3
    };
    const rowStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d8b8f0",
      stroke: "#2a1040",
      strokeThickness: 2
    };

    const diffLabel = difficulty === "insane" ? "insane-o" : difficulty;
    this.add.text(cx, top, `Best Times (${diffLabel})`, headerStyle).setOrigin(0.5);

    const loadingLabel = this.add.text(cx, top + 30, "Loading...", {
      ...rowStyle, color: "#a090c0"
    }).setOrigin(0.5);

    nostrService.fetchTopScores(difficulty, 10).then((entries) => {
      if (!this.scene.isActive()) return;
      loadingLabel.destroy();

      if (entries.length === 0) {
        this.add.text(cx, top + 50, "No scores yet!", {
          ...rowStyle, color: "#a090c0"
        }).setOrigin(0.5);
        return;
      }

      const rowH = 22;
      const rowTop = top + 30;
      const rankX = panelX + 8;
      const nameX = panelX + 36;
      const timeX = panelX + panelW - 8;
      const myPubkey = nostrService.getPubkey();

      const bg = this.add.graphics();
      bg.fillStyle(0x2a1040, 0.5);
      bg.fillRoundedRect(panelX, rowTop - 8, panelW, entries.length * rowH + 16, 8);

      const nameTexts: { text: Phaser.GameObjects.Text; pubkey: string; isMe: boolean }[] = [];

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const y = rowTop + i * rowH + 4;
        const isMe = entry.pubkey === myPubkey;
        const highlight = isMe ? "#ffb8e6" : rowStyle.color;

        const medal = i === 0 ? "1." : i === 1 ? "2." : i === 2 ? "3." : `${i + 1}.`;
        this.add.text(rankX, y, medal, { ...rowStyle, color: highlight }).setOrigin(0, 0.5);

        const nameLabel = isMe ? "You" : nostrService.getDisplayName(entry.pubkey);
        const nameText = this.add.text(nameX, y, nameLabel, { ...rowStyle, color: highlight }).setOrigin(0, 0.5);
        if (!isMe) nameTexts.push({ text: nameText, pubkey: entry.pubkey, isMe });

        this.add.text(timeX, y, formatTime(entry.totalMs), { ...rowStyle, color: highlight }).setOrigin(1, 0.5);
      }

      if (myPubkey) {
        const myRank = entries.findIndex(e => e.pubkey === myPubkey);
        if (myRank === -1) {
          const belowY = rowTop + entries.length * rowH + 20;
          this.add.text(cx, belowY, `Your time: ${formatTime(playerMs)}`, {
            ...rowStyle, color: "#a090c0", fontSize: "12px"
          }).setOrigin(0.5);
        }
      }

      const pubkeys = entries.map(e => e.pubkey);
      nostrService.fetchProfiles(pubkeys).then(() => {
        if (!this.scene.isActive()) return;
        for (const { text, pubkey } of nameTexts) {
          text.setText(nostrService.getDisplayName(pubkey));
        }
      }).catch(() => { /* keep npub fallbacks */ });
    }).catch(() => {
      if (!this.scene.isActive()) return;
      loadingLabel.setText("Could not load scores");
      loadingLabel.setColor("#ff8888");
    });
  }

  private spawnSparkles(): void {
    if (!this.anims.exists("ice-sparkle")) {
      this.anims.create({
        key: "ice-sparkle",
        frames: this.anims.generateFrameNumbers("ice-sparkles", { start: 0, end: 4 }),
        frameRate: 8,
        repeat: -1
      });
    }

    const tints = [0xfff2a8, 0xffb8e6, 0xb8ecff, 0xd98cff, 0xffd1ff, 0xffffff];

    for (let i = 0; i < 24; i++) {
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(10, GAME_HEIGHT - 10);
      const scale = 0.5 + Math.random() * 0.8;

      const sparkle = this.add.sprite(x, y, "ice-sparkles", 0)
        .setScale(scale)
        .setAlpha(0.6)
        .setTint(tints[i % tints.length])
        .setDepth(0);

      sparkle.play({ key: "ice-sparkle", startFrame: Phaser.Math.Between(0, 4) });

      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0.25, to: 0.85 },
        scaleX: { from: scale * 0.7, to: scale * 1.2 },
        scaleY: { from: scale * 0.7, to: scale * 1.2 },
        duration: Phaser.Math.Between(900, 2200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1500),
        ease: "Sine.easeInOut"
      });

      this.tweens.add({
        targets: sparkle,
        y: y - Phaser.Math.Between(10, 28),
        duration: Phaser.Math.Between(2000, 4500),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
        ease: "Sine.easeInOut"
      });
    }
  }
}
