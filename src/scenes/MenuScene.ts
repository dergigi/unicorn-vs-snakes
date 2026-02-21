import Phaser from "phaser";
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_HEARTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  type Difficulty
} from "../config/gameConfig";

const FLOOR_Y = GAME_HEIGHT - 118;
const UNICORN_SPEED = 3.2;
const GATE_X = GAME_WIDTH - 100;
const GATE_OVERLAP_DIST = 28;
const RAINBOW_COLORS = [0xff6fa7, 0xffbf6a, 0xfff07a, 0x8ff59f, 0x7ad9ff, 0xba9bff];

export class MenuScene extends Phaser.Scene {
  private selectedDifficulty: Difficulty = DEFAULT_DIFFICULTY;
  private unicorn!: Phaser.GameObjects.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdA?: Phaser.Input.Keyboard.Key;
  private wasdD?: Phaser.Input.Keyboard.Key;
  private nextTrailAt = 0;
  private started = false;

  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.started = false;
    this.nextTrailAt = 0;

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

    const snakeSplash = this.add
      .image(GATE_X - 130, FLOOR_Y, "snake-1")
      .setOrigin(0.5, 1)
      .setScale(1.4)
      .setFlipX(true);
    this.tweens.add({
      targets: snakeSplash,
      angle: 5,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.add
      .text(GAME_WIDTH / 2, FLOOR_Y + 32, "Walk to the rainbow gate!", {
        fontSize: "18px",
        color: "#b8a8ff",
        fontFamily: "monospace"
      })
      .setOrigin(0.5);

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
      this.add
        .text(x, y, difficulty.toUpperCase(), {
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

  private emitRainbowTrail(time: number): void {
    if (time < this.nextTrailAt) {
      return;
    }
    this.nextTrailAt = time + 30;

    const tailDir = this.unicorn.flipX ? 1 : -1;
    const baseX = this.unicorn.x + tailDir * 16;
    const baseY = this.unicorn.y - 24;

    for (let i = 0; i < 4; i += 1) {
      const x = baseX + Phaser.Math.Between(-2, 2);
      const y = baseY + Phaser.Math.Between(-3, 3);
      const sparkle = this.add
        .rectangle(
          x,
          y,
          Phaser.Math.Between(3, 5),
          Phaser.Math.Between(3, 5)
        )
        .setFillStyle(RAINBOW_COLORS[Phaser.Math.Between(0, RAINBOW_COLORS.length - 1)], 1)
        .setDepth(this.unicorn.depth + 2)
        .setAlpha(0.95);

      this.tweens.add({
        targets: sparkle,
        x: x + tailDir * Phaser.Math.Between(20, 34),
        y: y + Phaser.Math.Between(-12, 14),
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        angle: Phaser.Math.Between(-70, 70),
        duration: Phaser.Math.Between(240, 380),
        ease: "Sine.easeOut",
        onComplete: () => sparkle.destroy()
      });
    }
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
