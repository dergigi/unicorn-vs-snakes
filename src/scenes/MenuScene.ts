import Phaser from "phaser";
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_HEARTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  type Difficulty
} from "../config/gameConfig";
import { spawnRainbowTrail } from "../utils/rainbowTrail";
import { type PatrolSnake, spawnPatrolSnakes, updatePatrolSnakes } from "../utils/patrolSnakes";
import { TouchControls } from "../input/TouchControls";
import { nostrService, type LeaderboardEntry } from "../nostr/nostrService";
import { formatTime } from "../utils/formatTime";

const GRASS_TOP = GAME_HEIGHT - 130;
const GRASS_HEIGHT = 52;
const FLOOR_Y = GRASS_TOP + 8;
const UNICORN_SPEED = 3.2;
const GATE_X = GAME_WIDTH - 100;
const GATE_OVERLAP_DIST = 28;


export class MenuScene extends Phaser.Scene {
  private selectedDifficulty: Difficulty = DEFAULT_DIFFICULTY;
  private unicorn!: Phaser.GameObjects.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdA?: Phaser.Input.Keyboard.Key;
  private wasdD?: Phaser.Input.Keyboard.Key;
  private jumpKey?: Phaser.Input.Keyboard.Key;
  private wasdW?: Phaser.Input.Keyboard.Key;
  private nextTrailAt = 0;
  private started = false;
  private menuSnakes: PatrolSnake[] = [];
  private unicornVY = 0;
  private unicornBaseY = 0;
  private unicornOnGround = true;
  private jumpHoldFrames = 0;
  private difficultyBounds: { difficulty: Difficulty; left: number; right: number; top: number; bottom: number }[] = [];
  private applyDifficultyStyles: (() => void) | null = null;
  private levelSkipPressCount = 0;
  private levelSkipTargetLevel?: number;
  private levelSkipResetTimer?: Phaser.Time.TimerEvent;
  private menuCreatedAt = 0;
  private touchControls?: TouchControls;
  private bestTimeLabel?: Phaser.GameObjects.Text;
  private scoreCache = new Map<Difficulty, LeaderboardEntry[]>();

  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.started = false;
    this.menuCreatedAt = Date.now();
    this.nextTrailAt = 0;
    this.menuSnakes = [];
    this.bestTimeLabel = undefined;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d1336).setOrigin(0, 0);
    for (let tx = 0; tx < GAME_WIDTH; tx += 32) {
      for (let ty = GRASS_TOP; ty < GRASS_TOP + GRASS_HEIGHT; ty += 32) {
        this.add.image(tx, ty, "grass-tile").setOrigin(0, 0).setDisplaySize(32, 32);
      }
    }
    this.add.rectangle(0, GRASS_TOP, GAME_WIDTH, GRASS_HEIGHT, 0x000000, 0.25).setOrigin(0, 0);

    this.add
      .text(GAME_WIDTH / 2, 72, "UNICORN VS SNAKES", {
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
    this.buildBestTimeLabel();

    this.add
      .image(GATE_X, FLOOR_Y, "finish-gate-open")
      .setOrigin(0.5, 1)
      .setScale(1.15);

    this.unicornBaseY = FLOOR_Y;
    this.unicornVY = 0;
    this.unicornOnGround = true;
    this.unicorn = this.add
      .sprite(120, FLOOR_Y, "unicorn", 0)
      .setOrigin(0.5, 1)
      .setScale(3);

    this.spawnMenuSnakes();

    const footerTop = GRASS_TOP + 64 + 10;
    const footerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: "13px",
      color: "#9b8cb8",
      fontFamily: "monospace"
    };
    const prefix = this.add.text(0, footerTop, "Prompted into existence by ", footerStyle).setOrigin(0, 0);
    const gigiLink = this.add.text(0, footerTop, "Gigi", {
      ...footerStyle,
      color: "#c88cb8"
    }).setOrigin(0, 0);
    const suffix = this.add.text(0, footerTop, "'s daughter.", footerStyle).setOrigin(0, 0);
    const totalW = prefix.width + gigiLink.width + suffix.width;
    const startX = (GAME_WIDTH - totalW) / 2;
    prefix.setX(startX);
    gigiLink.setX(startX + prefix.width);
    suffix.setX(startX + prefix.width + gigiLink.width);
    gigiLink.setInteractive({ useHandCursor: true });
    gigiLink.on("pointerover", () => gigiLink.setColor("#ffffff"));
    gigiLink.on("pointerout", () => gigiLink.setColor("#c88cb8"));
    gigiLink.on("pointerdown", () => window.open("https://dergigi.com", "_blank"));
    this.add
      .text(GAME_WIDTH / 2, footerTop + 20, `v${__APP_VERSION__}  ·  Unicorn sprite by magdum (CC-BY-SA 3.0) via OpenGameArt`, {
        fontSize: "11px",
        color: "#9b8cb8",
        fontFamily: "monospace"
      })
      .setOrigin(0.5, 0);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasdA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.wasdD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.jumpKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.wasdW = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.touchControls = new TouchControls(this);
    this.setupLevelSkipCheat();
    this.buildNostrButton();
  }

  update(time: number): void {
    updatePatrolSnakes(this.menuSnakes, time);

    if (this.started) {
      return;
    }

    const left = this.cursors?.left?.isDown || this.wasdA?.isDown || this.touchControls?.state.left;
    const right = this.cursors?.right?.isDown || this.wasdD?.isDown || this.touchControls?.state.right;
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

    const jumpHeld = this.jumpKey?.isDown || this.cursors?.up.isDown || this.wasdW?.isDown || this.touchControls?.state.jumpDown;
    const jumpJustPressed =
      Phaser.Input.Keyboard.JustDown(this.jumpKey!) ||
      Phaser.Input.Keyboard.JustDown(this.cursors!.up) ||
      (this.wasdW ? Phaser.Input.Keyboard.JustDown(this.wasdW) : false) ||
      this.touchControls?.state.jumpJustPressed;
    if (jumpJustPressed && this.unicornOnGround) {
      this.unicornVY = -5.5;
      this.unicornOnGround = false;
      this.jumpHoldFrames = 0;
    }

    const GRAVITY = 0.35;
    const MAX_HOLD_FRAMES = 18;
    if (!this.unicornOnGround) {
      if (jumpHeld && this.jumpHoldFrames < MAX_HOLD_FRAMES) {
        this.jumpHoldFrames++;
        this.unicornVY += GRAVITY - 0.35;
      } else {
        this.unicornVY += GRAVITY;
      }
      this.unicorn.y += this.unicornVY;
      if (this.unicorn.y >= this.unicornBaseY) {
        this.unicorn.y = this.unicornBaseY;
        this.unicornVY = 0;
        this.unicornOnGround = true;
        this.jumpHoldFrames = 0;
      }
    }

    this.checkButtonOverlap();

    if (!this.unicornOnGround) {
      this.unicorn.setFrame(2);
    } else if (moving) {
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
    this.touchControls?.resetFrameState();
  }

  private buildNostrButton(): void {
    if (!nostrService.isExtensionAvailable()) return;

    const btnX = GAME_WIDTH - 16;
    const btnY = 16;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#b8a0d8",
      stroke: "#1d1336",
      strokeThickness: 3,
    };

    const nostrBtn = this.add.text(btnX, btnY, "", style).setOrigin(1, 0);

    const updateLabel = (): void => {
      if (nostrService.isLoggedIn()) {
        const pk = nostrService.getPubkey();
        nostrBtn.setText(pk ? nostrService.getDisplayName(pk) : "Connected");
        nostrBtn.setColor("#c8b8ff");
      } else {
        nostrBtn.setText("Login with Nostr");
        nostrBtn.setColor("#b8a0d8");
      }
    };

    const resolveAndUpdate = (): void => {
      updateLabel();
      const pk = nostrService.getPubkey();
      if (pk) {
        nostrService.fetchProfiles([pk]).then(() => {
          if (!this.scene.isActive()) return;
          updateLabel();
        }).catch(() => { /* keep fallback */ });
      }
    };

    resolveAndUpdate();
    nostrBtn.setInteractive({ useHandCursor: true });

    nostrBtn.on("pointerover", () => nostrBtn.setColor("#ffffff"));
    nostrBtn.on("pointerout", () => {
      nostrBtn.setColor(nostrService.isLoggedIn() ? "#c8b8ff" : "#b8a0d8");
    });

    nostrBtn.on("pointerdown", () => {
      if (nostrService.isLoggedIn()) {
        nostrService.logout();
        updateLabel();
        return;
      }
      nostrBtn.setText("Connecting...");
      nostrBtn.setColor("#8a7fb0");
      nostrService.login().then(() => {
        resolveAndUpdate();
      }).catch(() => {
        nostrBtn.setText("Login failed");
        nostrBtn.setColor("#ff8888");
        this.time.delayedCall(2000, updateLabel);
      });
    });
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
    this.difficultyBounds = [];

    difficulties.forEach((difficulty, index) => {
      const cx = 222 + index * 172;
      const cy = 262;

      this.difficultyBounds.push({
        difficulty,
        left: cx - bw / 2,
        right: cx + bw / 2,
        top: cy - bh / 2,
        bottom: cy + bh / 2
      });

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
        easy: "EASY",
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
          .image(text.x + text.width / 2 + 10, cy, "pink-skull")
          .setScale(0.8);
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
      this.refreshBestTime();
    };
    this.applyDifficultyStyles = applyStyles;
    applyStyles();
  }

  private buildBestTimeLabel(): void {
    this.scoreCache.clear();
    this.bestTimeLabel = this.add.text(GAME_WIDTH / 2, 306, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#a090c0",
      stroke: "#1d1336",
      strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0.85);
    this.refreshBestTime();
  }

  private refreshBestTime(): void {
    if (!this.bestTimeLabel) return;

    const diff = this.selectedDifficulty;
    const cached = this.scoreCache.get(diff);
    if (cached) {
      this.showBestTime(cached, diff);
      return;
    }

    this.bestTimeLabel.setText("Best: ...");
    nostrService.fetchTopScores(diff, 1).then((entries) => {
      if (!this.scene.isActive()) return;
      this.scoreCache.set(diff, entries);
      if (this.selectedDifficulty === diff) {
        this.showBestTime(entries, diff);
      }
    }).catch(() => {
      if (!this.scene.isActive()) return;
      if (this.selectedDifficulty === diff) {
        this.bestTimeLabel?.setText("");
      }
    });
  }

  private static readonly DIFFICULTY_LABELS: Record<Difficulty, string> = {
    easy: "easy", normal: "normal", hard: "hard", insane: "insane-o"
  };

  private showBestTime(entries: LeaderboardEntry[], diff: Difficulty): void {
    if (!this.bestTimeLabel || this.selectedDifficulty !== diff) return;
    const label = MenuScene.DIFFICULTY_LABELS[diff];
    if (entries.length === 0) {
      this.bestTimeLabel.setText(`No ${label} scores yet`);
    } else {
      this.bestTimeLabel.setText(`Best ${label} time: ${formatTime(entries[0].totalMs)}`);
    }
  }

  private checkButtonOverlap(): void {
    const spriteH = 48;
    const spriteW = 48;
    const uLeft = this.unicorn.x - spriteW / 2;
    const uRight = this.unicorn.x + spriteW / 2;
    const uTop = this.unicorn.y - spriteH;
    const uBottom = this.unicorn.y;

    for (const btn of this.difficultyBounds) {
      if (uRight > btn.left && uLeft < btn.right && uBottom > btn.top && uTop < btn.bottom) {
        if (this.selectedDifficulty !== btn.difficulty) {
          this.selectedDifficulty = btn.difficulty;
          this.applyDifficultyStyles?.();
        }
        break;
      }
    }
  }

  private spawnMenuSnakes(): void {
    this.menuSnakes = spawnPatrolSnakes(this, [
      { x: 80, patrol: 100, speed: 0.8 },
      { x: 260, patrol: 120, speed: -1.0 },
      { x: 420, patrol: 110, speed: 0.9 },
      { x: 560, patrol: 100, speed: -0.7 },
      { x: 700, patrol: 130, speed: 1.1 },
      { x: 860, patrol: 90, speed: -0.85 },
    ], GRASS_TOP + GRASS_HEIGHT);
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

  private setupLevelSkipCheat(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }
    this.levelSkipPressCount = 0;
    this.levelSkipTargetLevel = undefined;

    const onTwo = (): void => this.handleLevelSkipKey(2);
    const onThree = (): void => this.handleLevelSkipKey(3);
    const onFour = (): void => this.handleLevelSkipKey(4);
    const onFive = (): void => this.handleLevelSkipKey(5);
    const onSix = (): void => this.handleLevelSkipKey(6);
    keyboard.on("keydown-TWO", onTwo, this);
    keyboard.on("keydown-THREE", onThree, this);
    keyboard.on("keydown-FOUR", onFour, this);
    keyboard.on("keydown-FIVE", onFive, this);
    keyboard.on("keydown-SIX", onSix, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard.off("keydown-TWO", onTwo, this);
      keyboard.off("keydown-THREE", onThree, this);
      keyboard.off("keydown-FOUR", onFour, this);
      keyboard.off("keydown-FIVE", onFive, this);
      keyboard.off("keydown-SIX", onSix, this);
      this.levelSkipResetTimer?.remove(false);
      this.levelSkipResetTimer = undefined;
      this.touchControls?.destroy();
    });
  }

  private handleLevelSkipKey(targetLevel: number): void {
    if (this.started) {
      return;
    }
    if (this.levelSkipTargetLevel !== targetLevel) {
      this.levelSkipPressCount = 0;
      this.levelSkipTargetLevel = targetLevel;
    }
    this.levelSkipPressCount += 1;
    this.levelSkipResetTimer?.remove(false);
    this.levelSkipResetTimer = this.time.delayedCall(1500, () => {
      this.levelSkipPressCount = 0;
      this.levelSkipTargetLevel = undefined;
      this.levelSkipResetTimer = undefined;
    });

    if (this.levelSkipPressCount < 5) {
      return;
    }
    this.levelSkipPressCount = 0;
    this.levelSkipTargetLevel = undefined;
    this.levelSkipResetTimer?.remove(false);
    this.levelSkipResetTimer = undefined;

    if (targetLevel === 5) {
      this.scene.start("WinScene", {
        totalSparkles: 63,
        totalApples: 4,
        totalPowerups: 3,
        difficulty: this.selectedDifficulty,
        levelTimes: [12345, 23456, 34567, 45678],
        menuTimeMs: 6789,
        cheated: true
      });
      return;
    }
    if (targetLevel === 6) {
      this.scene.start("GameOverScene", {
        maxLives: 5,
        difficulty: this.selectedDifficulty,
        levelNumber: 3,
        levelTimes: [12345, 23456],
        menuTimeMs: 6789
      });
      return;
    }
    this.startGame(targetLevel);
  }

  private startGame(levelNumber = 1): void {
    if (this.started) {
      return;
    }
    this.started = true;

    const maxLives = DIFFICULTY_HEARTS[this.selectedDifficulty];
    const sceneData = {
      difficulty: this.selectedDifficulty,
      maxLives,
      levelNumber,
      currentLives: maxLives,
      menuTimeMs: Date.now() - this.menuCreatedAt,
      cheated: levelNumber > 1
    };
    this.scene.start("GameScene", sceneData);
    this.scene.launch("UIScene", sceneData);
  }
}
