import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/gameConfig";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  create(): void {
    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    const overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.6
    );
    overlay.setScrollFactor(0);

    this.add.text(GAME_WIDTH / 2, 120, "PAUSED", {
      fontFamily: "monospace",
      fontSize: "48px",
      color: "#ffffff",
      stroke: "#24133d",
      strokeThickness: 6
    }).setOrigin(0.5);

    const menuItems = ["Resume", "Restart Level", "Settings", "Quit to Menu"];
    const startY = 220;
    const spacing = 52;

    for (let i = 0; i < menuItems.length; i++) {
      const label = menuItems[i];
      const text = this.add.text(GAME_WIDTH / 2, startY + i * spacing, label, {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#cccccc",
        stroke: "#24133d",
        strokeThickness: 4
      }).setOrigin(0.5);

      text.setInteractive({ useHandCursor: true });
      text.on("pointerover", () => {
        text.setColor("#ffffff");
        text.setScale(1.08);
      });
      text.on("pointerout", () => {
        text.setColor("#cccccc");
        text.setScale(1);
      });

      if (label === "Resume") {
        text.on("pointerdown", () => this.resumeGame());
      }
    }

    this.input.keyboard?.on("keydown-ESC", this.resumeGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-ESC", this.resumeGame, this);
    });
  }

  private resumeGame(): void {
    this.scene.resume("GameScene");
    this.scene.resume("UIScene");
    this.scene.stop();
  }
}
