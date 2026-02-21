import Phaser from "phaser";
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_HEARTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  type Difficulty
} from "../config/gameConfig";

export class MenuScene extends Phaser.Scene {
  private selectedDifficulty: Difficulty = DEFAULT_DIFFICULTY;

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

    this.add.text(GAME_WIDTH / 2, 295, "Difficulty", {
      fontSize: "24px",
      color: "#fff1ff",
      fontFamily: "monospace"
    }).setOrigin(0.5);

    const difficulties: Difficulty[] = ["easy", "normal", "hard", "insane"];
    const buttons: Record<Difficulty, Phaser.GameObjects.Rectangle> = {
      easy: this.add.rectangle(0, 0, 1, 1, 0),
      normal: this.add.rectangle(0, 0, 1, 1, 0),
      hard: this.add.rectangle(0, 0, 1, 1, 0),
      insane: this.add.rectangle(0, 0, 1, 1, 0)
    };

    difficulties.forEach((difficulty, index) => {
      const x = 222 + index * 172;
      const button = this.add.rectangle(x, 336, 154, 56, 0x6f5cc4).setStrokeStyle(2, 0xd5ccff);
      button.setInteractive({ useHandCursor: true });
      this.add.text(x, 336, difficulty.toUpperCase(), {
        fontSize: "22px",
        color: "#f8f4ff",
        fontFamily: "monospace"
      }).setOrigin(0.5);
      button.on("pointerdown", () => {
        this.selectedDifficulty = difficulty;
        updateDifficultyButtons();
      });
      buttons[difficulty] = button;
    });

    const updateDifficultyButtons = (): void => {
      difficulties.forEach((difficulty) => {
        const isSelected = difficulty === this.selectedDifficulty;
        buttons[difficulty].setFillStyle(isSelected ? 0xff7fd9 : 0x6f5cc4);
        buttons[difficulty].setStrokeStyle(isSelected ? 4 : 2, isSelected ? 0xffffff : 0xd5ccff);
      });
    };
    updateDifficultyButtons();

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

    const startGame = (): void => {
      const maxLives = DIFFICULTY_HEARTS[this.selectedDifficulty];
      const sceneData = {
        difficulty: this.selectedDifficulty,
        maxLives
      };
      this.scene.start("GameScene", sceneData);
      this.scene.launch("UIScene", sceneData);
    };

    startButton.on("pointerdown", () => {
      startGame();
    });

    this.input.keyboard?.once("keydown-SPACE", () => {
      startGame();
    });
  }
}
