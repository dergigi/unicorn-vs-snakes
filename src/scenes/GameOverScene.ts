import Phaser from "phaser";
import { DEFAULT_DIFFICULTY, GAME_HEIGHT, GAME_WIDTH, type Difficulty } from "../config/gameConfig";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data?: { maxLives?: number; difficulty?: Difficulty; levelNumber?: number }): void {
    const maxLives = data?.maxLives ?? 5;
    const difficulty = data?.difficulty ?? DEFAULT_DIFFICULTY;
    const levelNumber = data?.levelNumber ?? 1;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1a0f30).setOrigin(0, 0);
    this.add.text(GAME_WIDTH / 2, 150, "Oops! Try Again", {
      fontFamily: "monospace",
      fontSize: "52px",
      color: "#ffacc9"
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 235, "The unicorn can always bounce back.", {
      fontFamily: "monospace",
      fontSize: "26px",
      color: "#d8f8ff"
    }).setOrigin(0.5);

    const retry = this.add.rectangle(GAME_WIDTH / 2, 350, 280, 72, 0xff8fe3);
    retry.setStrokeStyle(4, 0xffffff);
    retry.setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, 350, "RETRY", {
      fontFamily: "monospace",
      fontSize: "30px",
      color: "#291540"
    }).setOrigin(0.5);

    retry.on("pointerdown", () => {
      const sceneData = { maxLives, difficulty, levelNumber, currentLives: maxLives };
      this.scene.start("GameScene", sceneData);
      this.scene.launch("UIScene", sceneData);
    });
  }
}
