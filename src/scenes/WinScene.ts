import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/gameConfig";
import { formatTime } from "../utils/formatTime";

export class WinScene extends Phaser.Scene {
  constructor() {
    super("WinScene");
  }

  create(data: { sparkles?: number; levelTimes?: number[] }): void {
    const levelTimes = data.levelTimes ?? [];
    const totalMs = levelTimes.reduce((sum, t) => sum + t, 0);

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x152744).setOrigin(0, 0);
    this.add.rectangle(0, GAME_HEIGHT - 180, GAME_WIDTH, 180, 0x1f4d78).setOrigin(0, 0);

    this.add.text(GAME_WIDTH / 2, 80, "You Win!", {
      fontFamily: "monospace",
      fontSize: "58px",
      color: "#fff1a8"
    }).setOrigin(0.5);
    this.add.text(
      GAME_WIDTH / 2,
      150,
      `Sparkles Collected: ${data.sparkles ?? 0}`,
      {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#d8f8ff"
      }
    ).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 188, "Rainbow Kingdom is safe!", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#ffc9f2"
    }).setOrigin(0.5);

    let timesY = 230;
    for (let i = 0; i < levelTimes.length; i++) {
      this.add.text(GAME_WIDTH / 2, timesY, `Level ${i + 1}: ${formatTime(levelTimes[i])}`, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#c8c0e8"
      }).setOrigin(0.5);
      timesY += 28;
    }

    this.add.text(GAME_WIDTH / 2, timesY + 6, `Total: ${formatTime(totalMs)}`, {
      fontFamily: "monospace",
      fontSize: "26px",
      color: "#e0daf8"
    }).setOrigin(0.5);

    const btnY = Math.max(timesY + 64, 400);
    const again = this.add.rectangle(GAME_WIDTH / 2, btnY, 320, 76, 0xfff1a6);
    again.setStrokeStyle(4, 0xffffff);
    again.setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, btnY, "PLAY AGAIN", {
      fontFamily: "monospace",
      fontSize: "32px",
      color: "#37310f"
    }).setOrigin(0.5);

    again.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}
