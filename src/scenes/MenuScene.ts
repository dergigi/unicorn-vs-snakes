import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/gameConfig";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d1336).setOrigin(0, 0);
    this.add.rectangle(0, GAME_HEIGHT - 160, GAME_WIDTH, 160, 0x4d3a8c).setOrigin(0, 0);
    this.add.text(GAME_WIDTH / 2, 140, "UNICORNS VS SNAKES", {
      fontSize: "42px",
      color: "#fff1ff",
      fontFamily: "monospace"
    }).setOrigin(0.5);
    this.add.text(
      GAME_WIDTH / 2,
      220,
      "Collect sparkles, dodge silly snakes,\nand reach the rainbow gate!",
      {
        fontSize: "24px",
        align: "center",
        color: "#dff8ff",
        fontFamily: "monospace"
      }
    ).setOrigin(0.5);
    this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 24,
      "Unicorn sprite by magdum (CC-BY-SA 3.0) via OpenGameArt",
      {
        fontSize: "12px",
        color: "#d0c7ff",
        fontFamily: "monospace"
      }
    ).setOrigin(0.5);

    const startButton = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 90,
      280,
      72,
      0xff7fd9
    );
    startButton.setStrokeStyle(4, 0xffffff);
    startButton.setInteractive({ useHandCursor: true });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 90, "START ADVENTURE", {
      fontSize: "28px",
      color: "#2d1543",
      fontFamily: "monospace"
    }).setOrigin(0.5);

    startButton.on("pointerdown", () => {
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });

    this.input.keyboard?.once("keydown-SPACE", () => {
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });
  }
}
