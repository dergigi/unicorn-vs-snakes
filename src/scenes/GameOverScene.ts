import Phaser from "phaser";
import { DEFAULT_DIFFICULTY, GAME_HEIGHT, GAME_WIDTH, type Difficulty } from "../config/gameConfig";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data?: { maxLives?: number; difficulty?: Difficulty; levelNumber?: number; levelTimes?: number[]; menuTimeMs?: number }): void {
    const maxLives = data?.maxLives ?? 5;
    const difficulty = data?.difficulty ?? DEFAULT_DIFFICULTY;
    const levelNumber = data?.levelNumber ?? 1;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1a0f30).setOrigin(0, 0);
    this.add.text(GAME_WIDTH / 2, 90, "Those darn snakes!", {
      fontFamily: "monospace",
      fontSize: "52px",
      color: "#ffacc9"
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 160, "But unicorns are known to bounce back.", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#d8f8ff"
    }).setOrigin(0.5);

    const btnY = 300;
    const retry = this.add.rectangle(GAME_WIDTH / 2, btnY, 280, 72, 0xff8fe3);
    retry.setStrokeStyle(4, 0xffffff);
    retry.setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, btnY, "RETRY", {
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
