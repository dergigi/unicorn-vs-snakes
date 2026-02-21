import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Snake } from "../entities/Snake";
import { GAME_EVENTS } from "../config/events";
import {
  GAME_HEIGHT,
  MAX_LIVES,
  PLAYER_HIT_INVULNERABILITY_MS,
  REQUIRED_SPARKLES_TO_FINISH,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from "../config/gameConfig";
import { CheckpointSystem } from "../systems/CheckpointSystem";
import { CollectibleSystem } from "../systems/CollectibleSystem";
import type { LevelData } from "../types/LevelData";
import { beep } from "../utils/sfx";

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
  private lives = MAX_LIVES;
  private canTakeDamageAt = 0;
  private levelComplete = false;
  private levelData!: LevelData;
  private audioContext?: AudioContext;
  private lavaHitbox?: Phaser.GameObjects.Rectangle;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.levelComplete = false;
    this.lives = MAX_LIVES;
    this.canTakeDamageAt = 0;
    this.audioContext = "context" in this.sound ? (this.sound.context as AudioContext) : undefined;

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor("#26164a");

    this.drawBackground();
    this.createLava();
    this.createControls();

    this.levelData = this.cache.json.get("level-1") as LevelData;

    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.levelData.platforms) {
      const tile = this.platforms.create(platform.x, platform.y, "ground");
      tile.setDisplaySize(platform.width, platform.height);
      tile.refreshBody();
    }

    this.player = new Player(
      this,
      this.levelData.spawn.x,
      this.levelData.spawn.y,
      this.cursors
    );
    this.physics.add.collider(this.player, this.platforms);

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
      .staticImage(this.levelData.finishGate.x, this.levelData.finishGate.y, "finish-gate")
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
        this.scene.start("GameOverScene");
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
      this.scene.start("WinScene", {
        sparkles: collected
      });
    });
  }
}
