import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, type Difficulty } from "../config/gameConfig";
import { formatTime } from "../utils/formatTime";

interface WinData {
  totalSparkles?: number;
  difficulty?: Difficulty;
  levelTimes?: number[];
  menuTimeMs?: number;
}

export class WinScene extends Phaser.Scene {
  constructor() {
    super("WinScene");
  }

  create(data: WinData): void {
    const levelTimes = data.levelTimes ?? [];
    const menuTimeMs = data.menuTimeMs ?? 0;
    const totalMs = menuTimeMs + levelTimes.reduce((sum, t) => sum + t, 0);
    const difficulty = data.difficulty ?? "normal";

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x152744).setOrigin(0, 0);
    this.add.rectangle(0, GAME_HEIGHT - 180, GAME_WIDTH, 180, 0x1f4d78).setOrigin(0, 0);

    this.add.text(GAME_WIDTH / 2, 56, "Yaaaay!", {
      fontFamily: "monospace",
      fontSize: "52px",
      color: "#fff1a8"
    }).setOrigin(0.5);
    this.add.text(
      GAME_WIDTH / 2, 116,
      `Total sparkles collected: ${data.totalSparkles ?? 0}`,
      { fontFamily: "monospace", fontSize: "22px", color: "#d8f8ff" }
    ).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 148, "Rainbow Kingdom is safe!", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffc9f2"
    }).setOrigin(0.5);

    let timesY = 180;
    this.add.text(GAME_WIDTH / 2, timesY, `Menu: ${formatTime(menuTimeMs)}`, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#c8c0e8"
    }).setOrigin(0.5);
    timesY += 22;
    for (let i = 0; i < levelTimes.length; i++) {
      this.add.text(GAME_WIDTH / 2, timesY, `Level ${i + 1}: ${formatTime(levelTimes[i])}`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#c8c0e8"
      }).setOrigin(0.5);
      timesY += 22;
    }

    this.add.text(GAME_WIDTH / 2, timesY + 4, `Total: ${formatTime(totalMs)}`, {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#e0daf8"
    }).setOrigin(0.5);

    const shareText =
      `I just beat Unicorn vs Snakes on ${difficulty} difficulty in ${formatTime(totalMs)}!`;

    const dialogWidth = GAME_WIDTH - 100;
    const dialogHeight = 72;
    const dialogX = 50;
    const dialogY = timesY + 40;
    const portraitSize = 42;
    const portraitCenterX = dialogX + 30;
    const portraitCenterY = dialogY + dialogHeight / 2;

    const dialog = this.add.graphics();
    dialog.fillStyle(0x10243a, 0.95);
    dialog.lineStyle(3, 0xb8ecff, 1);
    dialog.fillRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 14);
    dialog.strokeRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 14);

    this.add.sprite(portraitCenterX, portraitCenterY, "unicorn", 0)
      .setDisplaySize(portraitSize, portraitSize);

    this.add.text(
      dialogX + 62,
      portraitCenterY,
      shareText,
      {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#e6fbff",
        align: "left",
        wordWrap: { width: dialogWidth - 100 },
        stroke: "#091321",
        strokeThickness: 3
      }
    ).setOrigin(0, 0.5);

    const copyBtn = this.add.text(
      dialogX + dialogWidth - 14,
      dialogY + dialogHeight - 14,
      "📋",
      { fontSize: "16px" }
    ).setOrigin(1, 1);
    copyBtn.setInteractive({ useHandCursor: true });
    copyBtn.on("pointerover", () => copyBtn.setScale(1.25));
    copyBtn.on("pointerout", () => copyBtn.setScale(1));
    copyBtn.on("pointerdown", () => {
      navigator.clipboard.writeText(shareText).then(() => {
        copyBtn.setText("✓");
        this.time.delayedCall(1500, () => copyBtn.setText("📋"));
      });
    });

    const btnY = dialogY + dialogHeight + 42;
    const again = this.add.rectangle(GAME_WIDTH / 2, btnY, 280, 60, 0xfff1a6);
    again.setStrokeStyle(4, 0xffffff);
    again.setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, btnY, "PLAY AGAIN", {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#37310f"
    }).setOrigin(0.5);

    again.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}
