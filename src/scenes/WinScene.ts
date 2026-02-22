import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, LEVEL_COUNT, type Difficulty } from "../config/gameConfig";
import { formatTime } from "../utils/formatTime";

interface WinData {
  totalSparkles?: number;
  totalApples?: number;
  totalPowerups?: number;
  difficulty?: Difficulty;
  levelTimes?: number[];
  menuTimeMs?: number;
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

    this.add.text(cx, 122, `Sparkles: ${data.totalSparkles ?? 0}`, statsStyle).setOrigin(0.5);

    // Times table — two columns: label right-aligned, time left-aligned
    const allTimes: [string, number][] = [
      ["Level 0", menuTimeMs],
      ...levelTimes.map((t, i): [string, number] => [`Level ${i + 1}`, t])
    ];

    const tableTop = 152;
    const rowH = 18;
    const labelX = cx - 10;
    const valueX = cx + 10;

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

    const dialogX = (GAME_WIDTH - dialogWidth) / 2;
    const dialogY = totalY + (btnY - totalY - dialogHeight) / 2;
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
