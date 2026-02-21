import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Snake } from "../entities/Snake";
import { GAME_EVENTS } from "../config/events";
import {
  DEFAULT_DIFFICULTY,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_MOVE_SPEED,
  PLAYER_HIT_INVULNERABILITY_MS,
  REQUIRED_SPARKLES_TO_FINISH,
  TOTAL_SPARKLES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type Difficulty
} from "../config/gameConfig";
import { CheckpointSystem } from "../systems/CheckpointSystem";
import { CollectibleSystem } from "../systems/CollectibleSystem";
import type { LevelData } from "../types/LevelData";
import { beep } from "../utils/sfx";

const LEVEL_COUNT = 3;

type CritterMover = {
  hitbox: Phaser.GameObjects.Rectangle;
  previousX: number;
};

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
  private critterHitboxes: Phaser.GameObjects.Rectangle[] = [];
  private flameHitboxes: Phaser.GameObjects.Rectangle[] = [];
  private applePickups?: Phaser.Physics.Arcade.StaticGroup;
  private critterMovers: CritterMover[] = [];
  private storyCat?: Phaser.Physics.Arcade.Image;
  private wasNearStoryCat = false;
  private catStoryBox?: Phaser.GameObjects.Graphics;
  private catStoryPortrait?: Phaser.GameObjects.Image;
  private catStoryText?: Phaser.GameObjects.Text;
  private catNoiseText?: Phaser.GameObjects.Text;
  private catNoiseEvent?: Phaser.Time.TimerEvent;
  private rainbowPowerup?: Phaser.Physics.Arcade.Image;
  private nextRainbowTrailAt = 0;
  private gateUnlocked = false;
  private perfectSparkleHeartAwarded = false;
  private skyRelit = false;
  private skyRelightTop?: Phaser.GameObjects.Rectangle;
  private skyRelightGlow?: Phaser.GameObjects.Rectangle;
  private baseSkyLayer?: Phaser.GameObjects.Rectangle;
  private baseHorizonLayer?: Phaser.GameObjects.Rectangle;
  private levelSkipPressCount = 0;
  private levelSkipResetTimer?: Phaser.Time.TimerEvent;

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
    this.perfectSparkleHeartAwarded = false;
    this.skyRelit = false;
    this.lavaHitbox = undefined;
    this.snakes = [];
    this.stumpHitboxes = [];
    this.critterHitboxes = [];
    this.flameHitboxes = [];
    this.applePickups = undefined;
    this.critterMovers = [];
    this.storyCat = undefined;
    this.wasNearStoryCat = false;
    this.catStoryBox?.destroy();
    this.catStoryPortrait?.destroy();
    this.catStoryText?.destroy();
    this.catNoiseText?.destroy();
    this.catNoiseEvent?.remove(false);
    this.catStoryBox = undefined;
    this.catStoryPortrait = undefined;
    this.catStoryText = undefined;
    this.catNoiseText = undefined;
    this.catNoiseEvent = undefined;
    this.skyRelightTop?.destroy();
    this.skyRelightGlow?.destroy();
    this.skyRelightTop = undefined;
    this.skyRelightGlow = undefined;
    this.baseSkyLayer = undefined;
    this.baseHorizonLayer = undefined;
    this.levelSkipPressCount = 0;
    this.levelSkipResetTimer?.remove(false);
    this.levelSkipResetTimer = undefined;

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const bgColorByTheme: Record<LevelData["theme"], string> = {
      forest: "#1f3a2a",
      lava: "#26164a",
      castle: "#2f2b45"
    };
    this.cameras.main.setBackgroundColor(bgColorByTheme[this.levelData.theme]);

    this.drawBackground();
    this.createSkyRelightLayers();
    this.createLava();
    this.createControls();

    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.levelData.platforms) {
      const tile = this.platforms.create(platform.x, platform.y, "ground");
      tile.setDisplaySize(platform.width, platform.height);
      if (this.levelData.theme === "forest") {
        const isMainGroundLane = platform.y >= 500;
        tile.setTint(isMainGroundLane ? 0x8b5a3c : 0x6f8f52);
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
    this.createFriendlyCritters();
    this.createLavaFlames();
    this.createApples();
    this.createStoryCat();

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
    this.setupLevelSkipCheat();

    this.game.events.emit(GAME_EVENTS.livesChanged, this.lives);
    this.game.events.emit(GAME_EVENTS.sparkleChanged, this.collectibleSystem.getCollectedCount());
  }

  private setupLevelSkipCheat(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    keyboard.on("keydown-TWO", this.handleLevelSkipKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard.off("keydown-TWO", this.handleLevelSkipKey, this);
      this.levelSkipResetTimer?.remove(false);
      this.levelSkipResetTimer = undefined;
      this.levelSkipPressCount = 0;
    });
  }

  private handleLevelSkipKey(): void {
    if (!this.scene.isActive()) {
      return;
    }
    this.levelSkipPressCount += 1;
    this.levelSkipResetTimer?.remove(false);
    this.levelSkipResetTimer = this.time.delayedCall(1500, () => {
      this.levelSkipPressCount = 0;
      this.levelSkipResetTimer = undefined;
    });

    if (this.levelSkipPressCount < 5) {
      return;
    }
    this.levelSkipPressCount = 0;
    this.levelSkipResetTimer?.remove(false);
    this.levelSkipResetTimer = undefined;

    if (this.levelNumber >= 2) {
      return;
    }

    this.levelComplete = true;
    this.player?.setControlsEnabled(false);
    const sceneData = {
      maxLives: this.maxLives,
      difficulty: this.difficulty,
      levelNumber: 2,
      currentLives: this.lives
    };
    this.scene.stop("UIScene");
    this.scene.restart(sceneData);
    this.scene.launch("UIScene", sceneData);
  }

  update(time: number, delta: number): void {
    if (this.levelComplete) {
      return;
    }
    if (!this.player || !this.player.active) {
      return;
    }
    this.player.update(time, delta);
    this.updateFriendlyCritterPush();
    this.emitRainbowTrail(time);
    this.updateStoryCatBubbleVisibility();
    this.updateGateUnlockState();
    this.maybeAwardPerfectSparkleHeart();
    for (const snake of this.snakes) {
      if (!snake.active) {
        continue;
      }
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
      this.baseSkyLayer = this.add
        .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x21452d)
        .setOrigin(0, 0);
      this.baseHorizonLayer = this.add
        .rectangle(0, WORLD_HEIGHT - 210, WORLD_WIDTH, 210, 0x326a3f, 0.42)
        .setOrigin(0, 0);

      // Rolling hill silhouettes behind the tree layers.
      const farHillColor = 0x4f8455;
      for (let i = 0; i < 8; i += 1) {
        this.add
          .ellipse(150 + i * 520, WORLD_HEIGHT - 70 + (i % 2) * 10, 740, 180, farHillColor, 0.46)
          .setScrollFactor(0.2);
      }

      const nearHillColor = 0x67a268;
      for (let i = 0; i < 10; i += 1) {
        this.add
          .ellipse(80 + i * 410, WORLD_HEIGHT - 42 + (i % 3) * 8, 560, 140, nearHillColor, 0.52)
          .setScrollFactor(0.34);
      }

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
          .image(120 + i * 330, WORLD_HEIGHT - 40 - (i % 3) * 8, key)
          .setOrigin(0.5, 1)
          .setScale(0.68 + (i % 3) * 0.07)
          .setAlpha(0.84)
          .setTint(0x8fd57f)
          .setScrollFactor(0.46);
      }
      return;
    }

    if (this.levelData.theme === "castle") {
      this.baseSkyLayer = this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x2f2b45).setOrigin(0, 0);
      this.baseHorizonLayer = this.add
        .rectangle(0, WORLD_HEIGHT - 190, WORLD_WIDTH, 190, 0x4a4764, 0.45)
        .setOrigin(0, 0);

      // Distant castle silhouettes and towers for parallax depth.
      for (let i = 0; i < 9; i += 1) {
        const x = 140 + i * 420;
        const w = 170 + (i % 3) * 24;
        const h = 120 + (i % 2) * 22;
        this.add
          .rectangle(x, WORLD_HEIGHT - 58, w, h, 0x3c3958, 0.62)
          .setOrigin(0.5, 1)
          .setScrollFactor(0.24);
        this.add
          .rectangle(x - w * 0.26, WORLD_HEIGHT - h - 58, 30, 34, 0x4f4b73, 0.72)
          .setOrigin(0.5, 1)
          .setScrollFactor(0.24);
        this.add
          .rectangle(x + w * 0.28, WORLD_HEIGHT - h - 50, 26, 28, 0x4f4b73, 0.72)
          .setOrigin(0.5, 1)
          .setScrollFactor(0.24);
      }

      for (let i = 0; i < 12; i += 1) {
        const x = 80 + i * 320;
        const h = 86 + (i % 4) * 14;
        this.add
          .rectangle(x, WORLD_HEIGHT - 44, 120, h, 0x666286, 0.66)
          .setOrigin(0.5, 1)
          .setScrollFactor(0.4);
        this.add
          .rectangle(x, WORLD_HEIGHT - h - 44, 18, 22, 0x7d76a3, 0.8)
          .setOrigin(0.5, 1)
          .setScrollFactor(0.4);
      }
      return;
    }

    this.baseSkyLayer = this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x26164a).setOrigin(0, 0);
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

  private createSkyRelightLayers(): void {
    const topColor =
      this.levelData.theme === "forest"
        ? 0xa8f0ff
        : this.levelData.theme === "castle"
          ? 0xd7d9ff
          : 0xffe0b8;
    const glowColor =
      this.levelData.theme === "forest"
        ? 0xd8fbff
        : this.levelData.theme === "castle"
          ? 0xebebff
          : 0xfff0d2;

    // Invisible-at-start overlays that fade in once enough sparkles are collected.
    // Depth 0 keeps them above background paint but below platforms/entities (also depth 0, created later).
    this.skyRelightTop = this.add
      .rectangle(0, 0, WORLD_WIDTH, 300, topColor, 0)
      .setOrigin(0, 0)
      .setDepth(0);
    this.skyRelightGlow = this.add
      .rectangle(0, 170, WORLD_WIDTH, 340, glowColor, 0)
      .setOrigin(0, 0)
      .setDepth(0);
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

  private createFriendlyCritters(): void {
    if (this.levelData.theme !== "forest" || !this.levelData.friendlyCritters?.length) {
      return;
    }

    for (const critter of this.levelData.friendlyCritters) {
      const patrolLeft = critter.patrolLeft ?? Phaser.Math.Between(22, 30);
      const patrolRight = critter.patrolRight ?? Phaser.Math.Between(22, 30);
      const patrolStartX = critter.x - patrolLeft;
      const patrolEndX = critter.x + patrolRight;

      const critterSprite = this.add
        .image(patrolStartX, critter.y, "friendly-critter")
        .setOrigin(0.5, 1)
        .setDisplaySize(critter.width, critter.height)
        .setDepth(8);

      const hitbox = this.add.rectangle(
        patrolStartX,
        critter.y - critter.height / 2,
        Math.max(12, critter.width - 8),
        Math.max(12, critter.height - 4),
        0,
        0
      );
      this.physics.add.existing(hitbox, false);
      const body = hitbox.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);
      this.physics.add.collider(this.player, hitbox);
      this.critterHitboxes.push(hitbox);
      this.critterMovers.push({ hitbox, previousX: patrolStartX });

      // Friendly critters roam back and forth, optionally with custom bounds.
      const patrolDuration = Phaser.Math.Between(1400, 2100);
      this.tweens.add({
        targets: [critterSprite, hitbox],
        x: patrolEndX,
        duration: patrolDuration,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        onUpdate: (_tween, target, _key, current, previous) => {
          if (target !== critterSprite) {
            return;
          }
          critterSprite.setFlipX(current < previous);
        }
      });
    }
  }

  private createLavaFlames(): void {
    if (this.levelData.theme !== "lava" || !this.levelData.flames?.length) {
      return;
    }

    for (const flame of this.levelData.flames) {
      const patrolLeft = flame.patrolLeft ?? Phaser.Math.Between(22, 34);
      const patrolRight = flame.patrolRight ?? Phaser.Math.Between(22, 34);
      const patrolStartX = flame.x - patrolLeft;
      const patrolEndX = flame.x + patrolRight;

      const flameSprite = this.add
        .image(patrolStartX, flame.y, "lava-flame")
        .setOrigin(0.5, 1)
        .setDisplaySize(flame.width, flame.height)
        .setDepth(9);

      const hitbox = this.add.rectangle(
        patrolStartX,
        flame.y - flame.height / 2,
        Math.max(10, flame.width - 10),
        Math.max(14, flame.height - 6),
        0,
        0
      );
      this.physics.add.existing(hitbox, false);
      const body = hitbox.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);
      this.physics.add.overlap(this.player, hitbox, this.handlePlayerHit, undefined, this);
      this.flameHitboxes.push(hitbox);

      this.tweens.add({
        targets: [flameSprite, hitbox],
        x: patrolEndX,
        duration: Phaser.Math.Between(1200, 1900),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        onUpdate: (_tween, target, _key, current, previous) => {
          if (target !== flameSprite) {
            return;
          }
          flameSprite.setFlipX(current < previous);
        }
      });

      // Add a subtle flicker so static image reads like active fire.
      this.tweens.add({
        targets: flameSprite,
        alpha: 0.78,
        scaleY: 1.12,
        scaleX: 0.92,
        duration: Phaser.Math.Between(180, 260),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
  }

  private createApples(): void {
    if (this.levelData.theme !== "forest" || !this.levelData.apples?.length) {
      return;
    }

    this.applePickups = this.physics.add.staticGroup();
    for (const appleData of this.levelData.apples) {
      const apple = this.applePickups
        .create(appleData.x, appleData.y, "apple-pickup")
        .setOrigin(0.5, 1)
        .setDisplaySize(appleData.width, appleData.height)
        .setDepth(9);
      (apple as Phaser.Physics.Arcade.Image).refreshBody();
    }

    this.physics.add.overlap(this.player, this.applePickups, this.handleAppleCollect, undefined, this);
  }

  private handleAppleCollect(
    _playerObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    appleObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
  ): void {
    if (!this.player || !this.player.active) {
      return;
    }
    if (typeof appleObject !== "object" || appleObject === null || !("destroy" in appleObject)) {
      return;
    }

    const apple = appleObject as Phaser.GameObjects.GameObject;
    if (!apple.active) {
      return;
    }
    apple.destroy();

    const previousLives = this.lives;
    this.lives = Math.min(this.maxLives, this.lives + 1);
    if (this.lives !== previousLives) {
      this.game.events.emit(GAME_EVENTS.livesChanged, this.lives);
    }
    if (this.audioContext) {
      beep(this.audioContext, 760, 0.08, "triangle", 0.03);
    }
  }

  private updateFriendlyCritterPush(): void {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    for (const mover of this.critterMovers) {
      const deltaX = mover.hitbox.x - mover.previousX;
      mover.previousX = mover.hitbox.x;
      if (Math.abs(deltaX) < 0.08) {
        continue;
      }
      if (!this.physics.overlap(this.player, mover.hitbox)) {
        continue;
      }

      // Moving critters nudge the unicorn sideways without causing damage.
      playerBody.x += deltaX;
      playerBody.setVelocityX(
        Phaser.Math.Clamp(playerBody.velocity.x + deltaX * 34, -PLAYER_MOVE_SPEED, PLAYER_MOVE_SPEED)
      );
    }
  }

  private createStoryCat(): void {
    if (this.levelData.theme !== "forest" || !this.levelData.storyCat) {
      return;
    }

    const cat = this.physics.add
      .staticImage(this.levelData.storyCat.x, this.levelData.storyCat.y, "story-cat")
      .setOrigin(0.5, 1)
      .setDisplaySize(this.levelData.storyCat.width, this.levelData.storyCat.height)
      .setDepth(9);
    this.storyCat = cat;
    this.physics.add.collider(this.player, cat);

    this.catNoiseText = this.add
      .text(cat.x, cat.y - this.levelData.storyCat.height - 6, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#fff4d2",
        stroke: "#1b1220",
        strokeThickness: 3
      })
      .setOrigin(0.5, 1)
      .setDepth(12)
      .setAlpha(0);

    this.time.delayedCall(1200, () => this.emitCatNoise());
    this.catNoiseEvent = this.time.addEvent({
      delay: 2800,
      loop: true,
      callback: this.emitCatNoise,
      callbackScope: this
    });
  }

  private emitCatNoise(): void {
    if (!this.storyCat || !this.storyCat.active || !this.catNoiseText) {
      return;
    }

    const noises = ["meow!", "mrrp?", "purr...", "mew!"];
    const baseY = this.storyCat.y - this.storyCat.displayHeight - 6;
    this.catNoiseText
      .setText(Phaser.Utils.Array.GetRandom(noises))
      .setPosition(this.storyCat.x, baseY)
      .setAlpha(1);

    this.tweens.killTweensOf(this.catNoiseText);
    this.tweens.add({
      targets: this.catNoiseText,
      y: baseY - 10,
      alpha: 0,
      duration: 1350,
      ease: "Sine.easeOut"
    });
  }

  private showStoryCatBubble(): void {
    if (!this.storyCat) {
      return;
    }
    if (this.catStoryBox || this.catStoryText || this.catStoryPortrait) {
      return;
    }

    const dialogWidth = GAME_WIDTH - 120;
    const dialogHeight = 102;
    const dialogX = 60;
    const dialogY = 130;
    const portraitSize = 42;
    const portraitCenterX = dialogX + 30;
    const portraitCenterY = dialogY + dialogHeight / 2;

    const dialog = this.add.graphics().setDepth(1000).setScrollFactor(0);
    dialog.fillStyle(0x10243a, 0.95);
    dialog.lineStyle(3, 0xb8ecff, 1);
    dialog.fillRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 14);
    dialog.strokeRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 14);
    this.catStoryBox = dialog;

    this.catStoryPortrait = this.add
      .image(portraitCenterX, portraitCenterY, "story-cat")
      .setDisplaySize(portraitSize, portraitSize)
      .setFlipX(true)
      .setScrollFactor(0)
      .setDepth(1001);

    this.catStoryText = this.add
      .text(
        dialogX + 62,
        portraitCenterY,
        "Brave little unicorn! The Rainbow Kingdom's sparkling light was stolen by a wicked witch, and she put sneaky snakes everywhere. Collect sparkles to re-light the sky, open the gate, and don't get bitten by the snakes!",
        {
          fontFamily: "\"Press Start 2P\", \"VT323\", \"Courier New\", monospace",
          fontSize: "15px",
          color: "#e6fbff",
          align: "left",
          wordWrap: { width: dialogWidth - 76 },
          stroke: "#091321",
          strokeThickness: 3
        }
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    if (this.audioContext) {
      beep(this.audioContext, 620, 0.08, "triangle", 0.03);
    }
  }

  private hideStoryCatBubble(): void {
    this.catStoryBox?.destroy();
    this.catStoryPortrait?.destroy();
    this.catStoryText?.destroy();
    this.catStoryBox = undefined;
    this.catStoryPortrait = undefined;
    this.catStoryText = undefined;
  }

  private updateStoryCatBubbleVisibility(): void {
    if (!this.storyCat || !this.storyCat.active || !this.player || !this.player.active) {
      this.hideStoryCatBubble();
      this.wasNearStoryCat = false;
      return;
    }

    const horizontalNearDistance = 60;
    const verticalNearDistance = 48;
    const isNearCat =
      Math.abs(this.player.x - this.storyCat.x) <= horizontalNearDistance &&
      Math.abs(this.player.y - this.storyCat.y) <= verticalNearDistance;

    if (isNearCat && !this.wasNearStoryCat) {
      this.showStoryCatBubble();
      this.wasNearStoryCat = true;
      return;
    }

    if (!isNearCat && this.wasNearStoryCat) {
      this.hideStoryCatBubble();
      this.wasNearStoryCat = false;
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
    this.relightSky();
  }

  private relightSky(): void {
    if (this.skyRelit) {
      return;
    }
    this.skyRelit = true;

    if (this.skyRelightTop) {
      this.tweens.add({
        targets: this.skyRelightTop,
        alpha: 0.68,
        duration: 700,
        ease: "Sine.easeOut"
      });
    }
    if (this.skyRelightGlow) {
      this.tweens.add({
        targets: this.skyRelightGlow,
        alpha: 0.52,
        duration: 900,
        ease: "Sine.easeOut"
      });
    }

    // Permanently brighten the actual base sky colors once gate opens.
    if (this.levelData.theme === "forest") {
      this.baseSkyLayer?.setFillStyle(0x4fb66b, 1);
      this.baseHorizonLayer?.setFillStyle(0x71cc84, 0.5);
      this.cameras.main.setBackgroundColor("#4fb66b");
    } else if (this.levelData.theme === "castle") {
      this.baseSkyLayer?.setFillStyle(0x595f99, 1);
      this.baseHorizonLayer?.setFillStyle(0x8288c0, 0.55);
      this.cameras.main.setBackgroundColor("#595f99");
    } else {
      this.baseSkyLayer?.setFillStyle(0x5a3a8d, 1);
      this.cameras.main.setBackgroundColor("#5a3a8d");
    }

    // A short flash makes the unlock -> relight moment obvious.
    this.cameras.main.flash(220, 255, 248, 220, false);
  }

  private maybeAwardPerfectSparkleHeart(): void {
    if (this.perfectSparkleHeartAwarded) {
      return;
    }
    if (this.collectibleSystem.getCollectedCount() < TOTAL_SPARKLES) {
      return;
    }

    this.perfectSparkleHeartAwarded = true;
    this.lives += 1;
    this.game.events.emit(GAME_EVENTS.livesChanged, this.lives);
    if (this.audioContext) {
      beep(this.audioContext, 820, 0.09, "triangle", 0.03);
      this.time.delayedCall(100, () => beep(this.audioContext!, 980, 0.1, "triangle", 0.03));
    }
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
    if (!this.scene.isActive() || !this.player || !this.player.active || !this.player.body) {
      return;
    }
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
      const hazardX =
        typeof hazard === "object" && hazard !== null && "x" in hazard
          ? (hazard.x as number)
          : this.player.x;
      const direction = this.player.x < hazardX ? -1 : 1;
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body | undefined;
      if (!playerBody) {
        return;
      }
      this.player.setVelocityX(direction * 220);
      this.player.setVelocityY(-250);

      this.time.delayedCall(260, () => {
        if (!this.scene.isActive() || !this.player || !this.player.active) {
          return;
        }
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
    const hazardX =
      typeof hazard === "object" && hazard !== null && "x" in hazard
        ? (hazard.x as number)
        : this.player.x;
    const direction = this.player.x < hazardX ? -1 : 1;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (!playerBody) {
      return;
    }
    this.player.setVelocityX(direction * 220);
    this.player.setVelocityY(-250);

    this.time.delayedCall(260, () => {
      if (!this.scene.isActive() || !this.player || !this.player.active) {
        return;
      }
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

      if (!this.checkpointSystem) {
        return;
      }
      const spawn = this.checkpointSystem.getActiveSpawn();
      if (!spawn) {
        return;
      }
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
