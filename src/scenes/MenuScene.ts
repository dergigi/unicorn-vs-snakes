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
      .rectangle(0, FLOOR_Y + 14, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y - 14, 0x2a1e54)
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
    const colors: Record<Difficulty, { face: number; hi: number; shadow: number; muted: number }> = {
      easy:   { face: 0x6fdc7f, hi: 0xb4ffc0, shadow: 0x3a7a42, muted: 0x3d5e42 },
      normal: { face: 0xff7fd9, hi: 0xffbfee, shadow: 0x8f3f76, muted: 0x6a3f60 },
      hard:   { face: 0xffaa5b, hi: 0xffd5a8, shadow: 0x8f5a28, muted: 0x6a4f36 },
      insane: { face: 0xff5f6a, hi: 0xffaab0, shadow: 0x8f2f35, muted: 0x5e3438 },
    };

    const bw = 152;
    const bh = 50;
    const border = 4;
    const btnGraphics: Partial<Record<Difficulty, Phaser.GameObjects.Graphics>> = {};
    const hitAreas: Partial<Record<Difficulty, Phaser.GameObjects.Rectangle>> = {};

    difficulties.forEach((difficulty, index) => {
      const cx = 222 + index * 172;
      const cy = 262;
      const left = cx - bw / 2;
      const top = cy - bh / 2;

      const gfx = this.add.graphics();
      btnGraphics[difficulty] = gfx;

      const hitArea = this.add
        .rectangle(cx, cy, bw, bh, 0, 0)
        .setInteractive({ useHandCursor: true });
      hitAreas[difficulty] = hitArea;

      hitArea.on("pointerdown", () => {
        this.selectedDifficulty = difficulty;
        applyStyles();
      });

      const labels: Record<Difficulty, string> = {
        easy: "🍀 EASY",
        normal: "NORMAL",
        hard: "HARD",
        insane: "INSANE-O",
      };
      const label = labels[difficulty];
      const text = this.add
        .text(cx, cy, label, {
          fontSize: "16px",
          color: "#ffffff",
          fontFamily: "\"Press Start 2P\", \"Courier New\", monospace",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      if (difficulty === "insane") {
        this.add
          .image(text.x + text.width / 2 + 12, cy, "pink-skull")
          .setScale(1.4);
      }
    });

    const drawButton = (d: Difficulty, selected: boolean): void => {
      const gfx = btnGraphics[d];
      if (!gfx) return;
      gfx.clear();

      const cx = 222 + difficulties.indexOf(d) * 172;
      const cy = 262;
      const left = cx - bw / 2;
      const top = cy - bh / 2;
      const c = colors[d];
      const face = selected ? c.face : c.muted;
      const hi = selected ? c.hi : 0x5a5a6a;
      const shadow = selected ? c.shadow : 0x1a1a24;

      // Highlight edge (top + left)
      gfx.fillStyle(hi, 1);
      gfx.fillRect(left, top, bw, border);
      gfx.fillRect(left, top, border, bh);

      // Shadow edge (bottom + right)
      gfx.fillStyle(shadow, 1);
      gfx.fillRect(left, top + bh - border, bw, border);
      gfx.fillRect(left + bw - border, top, border, bh);

      // Face fill
      gfx.fillStyle(face, 1);
      gfx.fillRect(left + border, top + border, bw - border * 2, bh - border * 2);

      // Corner pixel notches for extra crunch
      gfx.fillStyle(0x000000, 0.3);
      gfx.fillRect(left, top, border, border);
      gfx.fillRect(left + bw - border, top, border, border);
      gfx.fillRect(left, top + bh - border, border, border);
      gfx.fillRect(left + bw - border, top + bh - border, border, border);

      gfx.setAlpha(selected ? 1 : 0.7);
    };

    const applyStyles = (): void => {
      for (const d of difficulties) {
        drawButton(d, d === this.selectedDifficulty);
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
