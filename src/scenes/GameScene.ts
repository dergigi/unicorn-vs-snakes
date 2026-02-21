import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Snake } from "../entities/Snake";
import { GAME_EVENTS } from "../config/events";
import {
  DEFAULT_DIFFICULTY,
  GAME_HEIGHT,
  PLAYER_HIT_INVULNERABILITY_MS,
  REQUIRED_SPARKLES_TO_FINISH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type Difficulty
} from "../config/gameConfig";
import { CheckpointSystem } from "../systems/CheckpointSystem";
import { CollectibleSystem } from "../systems/CollectibleSystem";
import type { LevelData } from "../types/LevelData";
import { beep } from "../utils/sfx";

const LEVEL_COUNT = 2;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys & {
    jump: Phaser.Input.Keyboard.Key;
  };
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private snakes: Snake[] = [];
  private collectibleSystem!: CollectibleSystem;
  private checkpointSystem!: CheckpointSystem;
  private finishGate!: Phaser.Physics.Arcade.Image;
  private lives = 5;
  private maxLives = 5;
  private difficulty: Difficulty = DEFAULT_DIFFICULTY;
  private levelNumber = 1;
  private canTakeDamageAt = 0;
  private levelComplete = false;
  private levelData!: LevelData;
  private audioContext?: AudioContext;
  private lavaHitbox?: Phaser.GameObjects.Rectangle;
  private stumpHitboxes: Phaser.GameObjects.Rectangle[] = [];
  private rainbowPowerup?: Phaser.Physics.Arcade.Image;
  private nextRainbowTrailAt = 0;
  private gateUnlocked = false;

  constructor() {
    super("GameScene");
  }

  create(data?: {
    maxLives?: number;
    difficulty?: Difficulty;
    levelNumber?: number;
    currentLives?: number;
  }): void {
    this.maxLives = data?.maxLives ?? 5;
    this.difficulty = data?.difficulty ?? DEFAULT_DIFFICULTY;
    this.levelNumber = data?.levelNumber ?? 1;
    this.levelComplete = false;
    this.lives = data?.currentLives ?? this.maxLives;
    this.canTakeDamageAt = 0;
    this.audioContext = "context" in this.sound ? (this.sound.context as AudioContext) : undefined;

    this.levelData = this.cache.json.get(`level-${this.levelNumber}`) as LevelData;
    this.gateUnlocked = false;
    this.lavaHitbox = undefined;
    this.snakes = [];
    this.stumpHitboxes = [];

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(
      this.levelData.theme === "forest" ? "#1f3a2a" : "#26164a"
    );

    this.drawBackground();
    this.createLava();
    this.createControls();

    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.levelData.platforms) {
      const tile = this.platforms.create(platform.x, platform.y, "ground");
      tile.setDisplaySize(platform.width, platform.height);
      if (this.levelData.theme === "forest") {
        tile.setTint(0x6fbf67);
      }
      tile.refreshBody();
    }

    this.player = new Player(
      this,
      this.levelData.spawn.x,
      this.levelData.spawn.y,
      this.cursors
    );
    this.player.setRainbowPowerup(false);
    this.physics.add.collider(this.player, this.platforms);
    this.createForestPuddles();
    this.createForestStumps();

    this.rainbowPowerup = this.physics.add
      .staticImage(
        this.levelData.rainbowPowerup.x,
        this.levelData.rainbowPowerup.y,
        "rainbow-powerup"
      )
      .setOrigin(0.5, 1)
      .setScale(1.7);
    this.physics.add.overlap(
      this.player,
      this.rainbowPowerup,
      this.handleRainbowPowerupCollect,
      undefined,
      this
    );

    this.checkpointSystem = new CheckpointSystem(this, this.levelData.spawn);
    for (const checkpoint of this.levelData.checkpoints) {
      this.checkpointSystem.addCheckpoint(checkpoint.x, checkpoint.y);
    }
    this.physics.add.overlap(
      this.player,
      this.checkpointSystem.getGroup(),
      this.checkpointSystem.handleCheckpoint
    );
    this.physics.add.collider(this.checkpointSystem.getGroup(), this.platforms);

    this.collectibleSystem = new CollectibleSystem(this);
    for (const sparkle of this.levelData.sparkles) {
      this.collectibleSystem.addSparkle(sparkle.x, sparkle.y);
    }
    this.physics.add.overlap(
      this.player,
      this.collectibleSystem.getGroup(),
      this.collectibleSystem.handleCollect
    );

    for (const snakeData of this.levelData.snakes) {
      const snake = new Snake(
        this,
        snakeData.x,
        snakeData.y,
        snakeData.patrolWidth,
        snakeData.speedFactor
      );
      this.physics.add.collider(snake, this.platforms);
      this.snakes.push(snake);
    }
    this.physics.add.overlap(this.player, this.snakes, this.handlePlayerHit, undefined, this);
    if (this.lavaHitbox) {
      this.physics.add.overlap(this.player, this.lavaHitbox, this.handlePlayerHit, undefined, this);
    }

    this.finishGate = this.physics.add
      .staticImage(this.levelData.finishGate.x, this.levelData.finishGate.y, "finish-gate-closed")
      .setOrigin(0.5, 1);
    this.physics.add.overlap(this.player, this.finishGate, this.tryFinishLevel, undefined, this);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08, -120, 40);

    this.game.events.emit(GAME_EVENTS.livesChanged, this.lives);
    this.game.events.emit(GAME_EVENTS.sparkleChanged, this.collectibleSystem.getCollectedCount());
  }

  update(time: number, delta: number): void {
    if (this.levelComplete) {
      return;
    }
    this.player.update(time, delta);
    this.emitRainbowTrail(time);
    this.updateGateUnlockState();
    for (const snake of this.snakes) {
      snake.update();
    }

    if (this.player.y > GAME_HEIGHT + 200) {
      this.handlePlayerHit(
        this.player as unknown as Phaser.Types.Physics.Arcade.GameObjectWithBody,
        this.player as unknown as Phaser.Types.Physics.Arcade.GameObjectWithBody
      );
    }
  }

  private drawBackground(): void {
    if (this.levelData.theme === "forest") {
      this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x21452d).setOrigin(0, 0);
      this.add.rectangle(0, WORLD_HEIGHT - 210, WORLD_WIDTH, 210, 0x326a3f, 0.42).setOrigin(0, 0);
      const treeKeys = [
        "tree-chestnut-1",
        "tree-chestnut-2",
        "tree-chestnut-3",
        "tree-gnarled",
        "tree-lpc-green",
        "tree-krook"
      ] as const;

      // Far parallax layer: lighter density for cleaner composition.
      for (let i = 0; i < 9; i += 1) {
        const key = treeKeys[i % treeKeys.length];
        this.add
          .image(220 + i * 400, WORLD_HEIGHT - 110 - (i % 2) * 12, key)
          .setOrigin(0.5, 1)
          .setScale(0.58 + (i % 2) * 0.08)
          .setAlpha(0.28)
          .setTint(0x6aa768)
          .setScrollFactor(0.28);
      }

      // Mid/near layer: fewer hero trees to avoid clutter.
      for (let i = 0; i < 11; i += 1) {
        const key = treeKeys[(i + 1) % treeKeys.length];
        this.add
          .image(120 + i * 330, WORLD_HEIGHT - 54 - (i % 3) * 8, key)
          .setOrigin(0.5, 1)
          .setScale(0.68 + (i % 3) * 0.07)
          .setAlpha(0.84)
          .setTint(0x8fd57f)
          .setScrollFactor(0.46);
      }
      return;
    }

    this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x26164a).setOrigin(0, 0);
    for (let i = 0; i < 7; i += 1) {
      const baseX = 180 + i * 500;
      const baseY = 112 + (i % 3) * 22;
      const scrollFactor = 0.45;

      this.add
        .ellipse(baseX, baseY + 20, 210, 62, 0x2d2055, 0.6)
        .setScrollFactor(scrollFactor);

      this.add
        .ellipse(baseX - 76, baseY + 6, 120, 64, 0x4b3a80, 0.75)
        .setScrollFactor(scrollFactor);
      this.add
        .ellipse(baseX - 22, baseY - 8, 146, 84, 0x4f3f88, 0.8)
        .setScrollFactor(scrollFactor);
      this.add
        .ellipse(baseX + 46, baseY - 4, 136, 76, 0x4e3e86, 0.8)
        .setScrollFactor(scrollFactor);
      this.add
        .ellipse(baseX + 102, baseY + 8, 112, 58, 0x4a3a7f, 0.75)
        .setScrollFactor(scrollFactor);

      this.add
        .ellipse(baseX - 20, baseY - 16, 78, 44, 0x7f72b7, 0.38)
        .setScrollFactor(scrollFactor);
      this.add
        .ellipse(baseX + 34, baseY - 14, 64, 36, 0x7f72b7, 0.28)
        .setScrollFactor(scrollFactor);
    }
  }

  private createLava(): void {
    if (this.levelData.theme !== "lava") {
      return;
    }
    const lavaTopY = WORLD_HEIGHT - 36;
    this.add.rectangle(0, lavaTopY, WORLD_WIDTH, 36, 0xff5d4a).setOrigin(0, 0);
    this.add.rectangle(0, lavaTopY + 10, WORLD_WIDTH, 26, 0xd92f3f).setOrigin(0, 0);

    // Simple repeating glow bubbles to sell the "hot lava" surface.
    for (let x = 20; x < WORLD_WIDTH; x += 130) {
      this.add.ellipse(x, lavaTopY + 8, 30, 10, 0xffcc66, 0.45);
      this.add.ellipse(x + 42, lavaTopY + 16, 20, 8, 0xffa64d, 0.35);
    }

    this.lavaHitbox = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 16, WORLD_WIDTH, 28, 0, 0);
    this.physics.add.existing(this.lavaHitbox, true);
  }

  private createForestPuddles(): void {
    if (this.levelData.theme !== "forest" || !this.levelData.waterPuddles?.length) {
      return;
    }

    for (const puddle of this.levelData.waterPuddles) {
      // Fill puddles down to scene bottom so they match full-height ground columns.
      const puddleTopY = puddle.y - puddle.height / 2;
      const deepWaterHeight = WORLD_HEIGHT - puddleTopY;
      const deepWaterCenterY = puddleTopY + deepWaterHeight / 2;

      this.add
        .rectangle(puddle.x, deepWaterCenterY, puddle.width, deepWaterHeight, 0x2b73c2, 0.88)
        .setDepth(2);
      this.add
        .rectangle(
          puddle.x,
          puddleTopY + 4,
          puddle.width * 0.84,
          Math.max(6, puddle.height * 0.44),
          0x9fe8ff,
          0.72
        )
        .setDepth(4);
    }
  }

  private createForestStumps(): void {
    if (this.levelData.theme !== "forest" || !this.levelData.treeStumps?.length) {
      return;
    }

    for (const stump of this.levelData.treeStumps) {
      this.add
        .image(stump.x, stump.y, "tree-stump")
        .setOrigin(0.5, 1)
        .setDisplaySize(stump.width, stump.height)
        .setDepth(8);

      const hitbox = this.add.rectangle(
        stump.x,
        stump.y - stump.height / 2,
        Math.max(8, stump.width - 6),
        Math.max(10, stump.height - 2),
        0,
        0
      );
      this.physics.add.existing(hitbox, true);
      this.physics.add.collider(this.player, hitbox);
      this.stumpHitboxes.push(hitbox);
    }
  }

  private createControls(): void {
    const baseCursors = this.input.keyboard?.createCursorKeys();
    const jumpKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    if (!baseCursors || !jumpKey) {
      throw new Error("Keyboard not available");
    }
    this.cursors = {
      ...baseCursors,
      jump: jumpKey
    };
  }

  private handleRainbowPowerupCollect(): void {
    if (!this.rainbowPowerup || !this.rainbowPowerup.active) {
      return;
    }
    this.rainbowPowerup.destroy();
    this.player.setRainbowPowerup(true);
    this.game.events.emit(GAME_EVENTS.rainbowPowerupCollected);
    if (this.audioContext) {
      beep(this.audioContext, 690, 0.08, "triangle", 0.03);
      this.time.delayedCall(100, () => beep(this.audioContext!, 930, 0.12, "triangle", 0.03));
    }
  }

  private emitRainbowTrail(time: number): void {
    if (!this.player.hasRainbowPower()) {
      return;
    }
    if (time < this.nextRainbowTrailAt) {
      return;
    }
    this.nextRainbowTrailAt = time + 30;

    const tailDirection = this.player.flipX ? 1 : -1;
    const baseX = this.player.x + tailDirection * 16;
    const baseY = this.player.y - 10;
    const colors = [0xff6fa7, 0xffbf6a, 0xfff07a, 0x8ff59f, 0x7ad9ff, 0xba9bff];

    for (let i = 0; i < 4; i += 1) {
      const x = baseX + Phaser.Math.Between(-2, 2);
      const y = baseY + Phaser.Math.Between(-3, 3);
      const sparkle = this.add
        .rectangle(x, y, Phaser.Math.Between(3, 5), Phaser.Math.Between(3, 5))
        .setFillStyle(colors[Phaser.Math.Between(0, colors.length - 1)], 1)
        .setDepth(this.player.depth + 2)
        .setAlpha(0.95);

      this.tweens.add({
        targets: sparkle,
        x: x + tailDirection * Phaser.Math.Between(20, 34),
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

  private updateGateUnlockState(): void {
    if (this.gateUnlocked) {
      return;
    }
    if (this.collectibleSystem.getCollectedCount() < REQUIRED_SPARKLES_TO_FINISH) {
      return;
    }
    this.gateUnlocked = true;
    this.finishGate.setTexture("finish-gate-open");
    this.finishGate.setScale(1.02);
    this.time.delayedCall(120, () => this.finishGate.setScale(1));
  }

  private handlePlayerHit(
    _playerObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    hazard:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
  ): void {
    if (this.time.now < this.canTakeDamageAt || this.levelComplete) {
      return;
    }

    if (this.player.hasRainbowPower()) {
      this.player.setRainbowPowerup(false);
      this.canTakeDamageAt = this.time.now + PLAYER_HIT_INVULNERABILITY_MS;
      this.game.events.emit(GAME_EVENTS.rainbowPowerupLost);
      this.game.events.emit(GAME_EVENTS.playerHit);
      if (this.audioContext) {
        beep(this.audioContext, 300, 0.12, "square", 0.03);
      }

      this.player.setControlsEnabled(false);
      this.player.setTint(0xffd998);
      const hazardX = "x" in hazard ? hazard.x : this.player.x;
      const direction = this.player.x < hazardX ? -1 : 1;
      this.player.setVelocityX(direction * 220);
      this.player.setVelocityY(-250);

      this.time.delayedCall(260, () => {
        this.player.clearTint();
        this.player.setControlsEnabled(true);
      });
      return;
    }

    this.lives -= 1;
    this.canTakeDamageAt = this.time.now + PLAYER_HIT_INVULNERABILITY_MS;
    this.game.events.emit(GAME_EVENTS.livesChanged, this.lives);
    this.game.events.emit(GAME_EVENTS.playerHit);
    if (this.audioContext) {
      beep(this.audioContext, 180, 0.16, "sawtooth", 0.045);
    }

    this.player.setControlsEnabled(false);
    this.player.setTint(0xff8da8);
    const hazardX = "x" in hazard ? hazard.x : this.player.x;
    const direction = this.player.x < hazardX ? -1 : 1;
    this.player.setVelocityX(direction * 220);
    this.player.setVelocityY(-250);

    this.time.delayedCall(260, () => {
      if (this.lives <= 0) {
        this.game.events.emit(GAME_EVENTS.gameOver);
        this.scene.stop("UIScene");
        this.scene.start("GameOverScene", {
          maxLives: this.maxLives,
          difficulty: this.difficulty,
          levelNumber: this.levelNumber
        });
        return;
      }

      const spawn = this.checkpointSystem.getActiveSpawn();
      this.player.resetAt(spawn.x, spawn.y);
      this.player.setControlsEnabled(true);
    });
  }

  private tryFinishLevel(): void {
    if (this.levelComplete) {
      return;
    }

    const collected = this.collectibleSystem.getCollectedCount();
    if (collected < REQUIRED_SPARKLES_TO_FINISH) {
      this.cameras.main.shake(120, 0.0025);
      if (this.audioContext) {
        beep(this.audioContext, 230, 0.09, "square", 0.03);
      }
      return;
    }

    this.levelComplete = true;
    this.player.setControlsEnabled(false);
    this.player.setVelocity(0, 0);
    if (this.audioContext) {
      beep(this.audioContext, 660, 0.1, "triangle", 0.035);
      this.time.delayedCall(120, () => beep(this.audioContext!, 880, 0.12, "triangle", 0.03));
    }
    this.game.events.emit(GAME_EVENTS.levelWon);
    this.scene.stop("UIScene");
    this.time.delayedCall(500, () => {
      if (this.levelNumber < LEVEL_COUNT) {
        const sceneData = {
          maxLives: this.maxLives,
          difficulty: this.difficulty,
          levelNumber: this.levelNumber + 1,
          currentLives: this.lives
        };
        // Restarting the same scene key is more reliable than start() here.
        this.scene.restart(sceneData);
        this.scene.launch("UIScene", sceneData);
        return;
      }

      this.scene.start("WinScene", {
        sparkles: collected
      });
    });
  }
}
