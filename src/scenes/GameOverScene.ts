import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/gameConfig";
import { type PatrolSnake, spawnPatrolSnakes, updatePatrolSnakes } from "../utils/patrolSnakes";

export class GameOverScene extends Phaser.Scene {
  private snakes: PatrolSnake[] = [];

  constructor() {
    super("GameOverScene");
  }

  create(): void {
    this.snakes = [];

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
    const btnW = 280;
    const btnH = 72;
    const retry = this.add.rectangle(GAME_WIDTH / 2, btnY, btnW, btnH, 0xff8fe3);
    retry.setStrokeStyle(4, 0xffffff);
    retry.setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, btnY, "RETRY", {
      fontFamily: "monospace",
      fontSize: "30px",
      color: "#291540"
    }).setOrigin(0.5);

    const barH = 4;
    const barY = btnY + btnH / 2 - barH;
    const barX = GAME_WIDTH / 2 - btnW / 2 + 4;
    const barMaxW = btnW - 8;
    const progressBar = this.add.rectangle(barX, barY, 0, barH, 0x291540, 0.35).setOrigin(0, 0);

    const autoRetryMs = 10000;
    this.tweens.add({
      targets: progressBar,
      width: barMaxW,
      duration: autoRetryMs,
      ease: "Linear",
      onComplete: () => this.scene.start("MenuScene")
    });

    retry.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });

    const snakeY = GAME_HEIGHT - 10;
    this.snakes = spawnPatrolSnakes(this, [
      { x: 60, patrol: 100, speed: 0.7 },
      { x: 180, patrol: 110, speed: -0.9 },
      { x: 300, patrol: 100, speed: 0.8 },
      { x: 420, patrol: 120, speed: -1.0 },
      { x: 540, patrol: 100, speed: 0.9 },
      { x: 660, patrol: 110, speed: -0.75 },
      { x: 780, patrol: 130, speed: 1.1 },
      { x: 900, patrol: 90, speed: -0.85 },
    ], snakeY, 1.3, 0);
  }

  update(time: number): void {
    updatePatrolSnakes(this.snakes, time);
  }
}
