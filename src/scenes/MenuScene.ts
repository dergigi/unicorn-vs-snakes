import Phaser from "phaser";
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_HEARTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  type Difficulty
} from "../config/gameConfig";
import { spawnRainbowTrail } from "../utils/rainbowTrail";

const FLOOR_Y = GAME_HEIGHT - 118;
const UNICORN_SPEED = 3.2;
const GATE_X = GAME_WIDTH - 100;
const GATE_OVERLAP_DIST = 28;

type MenuSnake = {
  sprite: Phaser.GameObjects.Image;
  minX: number;
  maxX: number;
  speed: number;
};

export class MenuScene extends Phaser.Scene {
  private selectedDifficulty: Difficulty = DEFAULT_DIFFICULTY;
  private unicorn!: Phaser.GameObjects.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdA?: Phaser.Input.Keyboard.Key;
  private wasdD?: Phaser.Input.Keyboard.Key;
  private nextTrailAt = 0;
  private started = false;
  private menuSnakes: MenuSnake[] = [];

  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.started = false;
    this.nextTrailAt = 0;
    this.menuSnakes = [];

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d1336).setOrigin(0, 0);
    this.add
      .rectangle(0, FLOOR_Y + 14, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y - 14, 0x4d3a8c)
      .setOrigin(0, 0);

    this.add
      .text(GAME_WIDTH / 2, 72, "UNICORNS VS SNAKES", {
        fontSize: "42px",
        color: "#fff1ff",
        fontFamily: "monospace"
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        138,
        "Collect sparkles, dodge silly snakes,\nand reach the rainbow gate!",
        {
          fontSize: "22px",
          align: "center",
          color: "#dff8ff",
          fontFamily: "monospace"
        }
      )
      .setOrigin(0.5);

    this.buildDifficultyButtons();

    this.add
      .image(GATE_X, FLOOR_Y, "finish-gate-open")
      .setOrigin(0.5, 1)
      .setScale(1.15);

    this.unicorn = this.add
      .sprite(120, FLOOR_Y, "unicorn", 0)
      .setOrigin(0.5, 1)
      .setScale(3);

    this.spawnPatrolSnakes();

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 12, "Unicorn sprite by magdum (CC-BY-SA 3.0) via OpenGameArt", {
        fontSize: "12px",
        color: "#d0c7ff",
        fontFamily: "monospace"
      })
      .setOrigin(0.5);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasdA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.wasdD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  update(time: number): void {
    this.updateMenuSnakes(time);

    if (this.started) {
      return;
    }

    const left = this.cursors?.left?.isDown || this.wasdA?.isDown;
    const right = this.cursors?.right?.isDown || this.wasdD?.isDown;
    let moving = false;

    if (left && !right) {
      this.unicorn.x -= UNICORN_SPEED;
      this.unicorn.setFlipX(true);
      moving = true;
    } else if (right && !left) {
      this.unicorn.x += UNICORN_SPEED;
      this.unicorn.setFlipX(false);
      moving = true;
    }

    this.unicorn.x = Phaser.Math.Clamp(this.unicorn.x, 40, GAME_WIDTH - 40);

    if (moving) {
      this.unicorn.setFrame(Math.floor(time / 120) % 4);
    } else {
      this.unicorn.setFrame(0);
    }

    if (moving) {
      this.emitRainbowTrail(time);
    }

    if (Math.abs(this.unicorn.x - GATE_X) < GATE_OVERLAP_DIST) {
      this.startGame();
    }
  }

  private buildDifficultyButtons(): void {
    const difficulties: Difficulty[] = ["easy", "normal", "hard", "insane"];
    const difficultyColors: Record<Difficulty, number> = {
      easy: 0x6fdc7f,
      normal: 0xff7fd9,
      hard: 0xffaa5b,
      insane: 0xff5f6a
    };
    const mutedColors: Record<Difficulty, number> = {
      easy: 0x4d6f53,
      normal: 0x7a4f6f,
      hard: 0x7a6249,
      insane: 0x6e4a4d
    };
    const buttons: Partial<Record<Difficulty, Phaser.GameObjects.Rectangle>> = {};

    difficulties.forEach((difficulty, index) => {
      const x = 222 + index * 172;
      const y = 262;
      const button = this.add
        .rectangle(x, y, 154, 56, 0x6f5cc4)
        .setStrokeStyle(2, 0xd5ccff)
        .setInteractive({ useHandCursor: true });
      const label = difficulty === "insane" ? "INSANE-O" : difficulty.toUpperCase();
      this.add
        .text(x, y, label, {
          fontSize: "22px",
          color: "#f8f4ff",
          fontFamily: "monospace"
        })
        .setOrigin(0.5);

      button.on("pointerdown", () => {
        this.selectedDifficulty = difficulty;
        applyStyles();
      });
      buttons[difficulty] = button;
    });

    const applyStyles = (): void => {
      for (const d of difficulties) {
        const btn = buttons[d];
        if (!btn) continue;
        const sel = d === this.selectedDifficulty;
        btn.setFillStyle(sel ? difficultyColors[d] : mutedColors[d]);
        btn.setAlpha(sel ? 1 : 0.7);
        btn.setStrokeStyle(sel ? 4 : 2, sel ? 0xffffff : 0x2f224f);
      }
    };
    applyStyles();
  }

  private spawnPatrolSnakes(): void {
    this.menuSnakes = [];
    const snakeY = FLOOR_Y + 46;
    const snakeDefs = [
      { x: 80, patrol: 100, speed: 0.8 },
      { x: 260, patrol: 120, speed: -1.0 },
      { x: 420, patrol: 110, speed: 0.9 },
      { x: 560, patrol: 100, speed: -0.7 },
      { x: 700, patrol: 130, speed: 1.1 },
      { x: 860, patrol: 90, speed: -0.85 },
    ];

    for (const def of snakeDefs) {
      const sprite = this.add
        .image(def.x, snakeY, "snake-1")
        .setOrigin(0.5, 1)
        .setScale(1.3)
        .setFlipX(def.speed < 0);
      this.menuSnakes.push({
        sprite,
        minX: def.x - def.patrol / 2,
        maxX: def.x + def.patrol / 2,
        speed: def.speed,
      });
    }
  }

  private updateMenuSnakes(time: number): void {
    for (const snake of this.menuSnakes) {
      snake.sprite.x += snake.speed;
      if (snake.sprite.x < snake.minX) {
        snake.sprite.x = snake.minX;
        snake.speed = Math.abs(snake.speed);
      } else if (snake.sprite.x > snake.maxX) {
        snake.sprite.x = snake.maxX;
        snake.speed = -Math.abs(snake.speed);
      }
      snake.sprite.setFlipX(snake.speed < 0);
      snake.sprite.setTexture((time >> 7) % 2 === 0 ? "snake-1" : "snake-2");
    }
  }

  private emitRainbowTrail(time: number): void {
    if (time < this.nextTrailAt) {
      return;
    }
    this.nextTrailAt = time + 30;

    const tailDir = this.unicorn.flipX ? 1 : -1;
    spawnRainbowTrail(
      this,
      this.unicorn.x + tailDir * 16,
      this.unicorn.y - 24,
      tailDir,
      this.unicorn.depth + 2
    );
  }

  private startGame(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    const maxLives = DIFFICULTY_HEARTS[this.selectedDifficulty];
    const sceneData = {
      difficulty: this.selectedDifficulty,
      maxLives,
      levelNumber: 1,
      currentLives: maxLives
    };
    this.scene.start("GameScene", sceneData);
    this.scene.launch("UIScene", sceneData);
  }
}
