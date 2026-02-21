import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/gameConfig";

export class WinScene extends Phaser.Scene {
  constructor() {
    super("WinScene");
  }

  create(data: { sparkles?: number }): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x152744).setOrigin(0, 0);
    this.add.rectangle(0, GAME_HEIGHT - 180, GAME_WIDTH, 180, 0x1f4d78).setOrigin(0, 0);

    this.add.text(GAME_WIDTH / 2, 130, "You Win!", {
      fontFamily: "monospace",
      fontSize: "58px",
      color: "#fff1a8"
    }).setOrigin(0.5);
    this.add.text(
      GAME_WIDTH / 2,
      220,
      `Sparkles Collected: ${data.sparkles ?? 0}`,
      {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#d8f8ff"
      }
    ).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 270, "Rainbow Kingdom is safe!", {
      fontFamily: "monospace",
      fontSize: "26px",
      color: "#ffc9f2"
    }).setOrigin(0.5);

    const again = this.add.rectangle(GAME_WIDTH / 2, 370, 320, 76, 0xfff1a6);
    again.setStrokeStyle(4, 0xffffff);
    again.setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, 370, "PLAY AGAIN", {
      fontFamily: "monospace",
      fontSize: "32px",
      color: "#37310f"
    }).setOrigin(0.5);

    again.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}
