import Phaser from "phaser";
import { Player, type Cursors } from "../entities/Player";
import { Snake } from "../entities/Snake";
import { GAME_EVENTS } from "../config/events";
import {
  BOSS_HEALTH_BY_DIFFICULTY,
  DEFAULT_DIFFICULTY,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_MOVE_SPEED,
  PLAYER_HIT_INVULNERABILITY_MS,
  TOTAL_SPARKLES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getRequiredSparklesToFinish,
  type Difficulty
} from "../config/gameConfig";
import { CheckpointSystem } from "../systems/CheckpointSystem";
import { CollectibleSystem } from "../systems/CollectibleSystem";
import type { LevelData } from "../types/LevelData";
import { spawnRainbowTrail } from "../utils/rainbowTrail";
import { beep } from "../utils/sfx";

const LEVEL_COUNT = 4;

type CritterMover = {
  hitbox: Phaser.GameObjects.Rectangle;
  previousX: number;
};

type PlatformMover = {
  image: Phaser.Physics.Arcade.Image;
  prevX: number;
  prevY: number;
};

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Cursors;
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
  private batSprites: Phaser.Physics.Arcade.Sprite[] = [];
  private bossWitch?: Phaser.Physics.Arcade.Sprite;
  private bossHealth = 0;
  private bossInvulnerableUntil = 0;
  private bossHeartSprites: Phaser.GameObjects.Image[] = [];
  private bossBatSpawnTimer?: Phaser.Time.TimerEvent;
  private mushroomPickup?: Phaser.Physics.Arcade.Image;
  private hasMushroomPower = false;
  private fireballKey?: Phaser.Input.Keyboard.Key;
  private fireballs?: Phaser.Physics.Arcade.Group;
  private nextFireballAt = 0;
  private skipRepositionAfterDamage = false;
  private applePickups?: Phaser.Physics.Arcade.Group;
  private critterMovers: CritterMover[] = [];
  private platformMovers: PlatformMover[] = [];
  private storyCat?: Phaser.Physics.Arcade.Sprite;
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
  private requiredSparklesToFinish = getRequiredSparklesToFinish(1);
  private levelSkipPressCount = 0;
  private levelSkipTargetLevel?: number;
  private levelSkipResetTimer?: Phaser.Time.TimerEvent;
  private timerStartMs = 0;
  private levelTimes: number[] = [];
  private menuTimeMs = 0;

  constructor() {
    super("GameScene");
  }

  create(data?: {
    maxLives?: number;
    difficulty?: Difficulty;
    levelNumber?: number;
    currentLives?: number;
    hasRainbow?: boolean;
    levelTimes?: number[];
    menuTimeMs?: number;
  }): void {
    this.maxLives = data?.maxLives ?? 5;
    this.difficulty = data?.difficulty ?? DEFAULT_DIFFICULTY;
    this.levelNumber = data?.levelNumber ?? 1;
    this.levelTimes = data?.levelTimes ?? [];
    this.menuTimeMs = data?.menuTimeMs ?? 0;
    this.timerStartMs = Date.now();
    this.levelComplete = false;
    this.lives = data?.currentLives ?? this.maxLives;
    this.canTakeDamageAt = 0;
    this.audioContext = "context" in this.sound ? (this.sound.context as AudioContext) : undefined;

    this.levelData = this.cache.json.get(`level-${this.levelNumber}`) as LevelData;
    this.requiredSparklesToFinish = getRequiredSparklesToFinish(this.levelNumber);
    this.gateUnlocked = false;
    this.perfectSparkleHeartAwarded = false;
    this.skyRelit = false;
    this.lavaHitbox = undefined;
    this.snakes = [];
    this.stumpHitboxes = [];
    this.critterHitboxes = [];
    this.flameHitboxes = [];
    this.batSprites = [];
    this.bossWitch = undefined;
    this.bossHealth = 0;
    this.bossInvulnerableUntil = 0;
    for (const heart of this.bossHeartSprites) {
      heart.destroy();
    }
    this.bossHeartSprites = [];
    this.bossBatSpawnTimer?.remove(false);
    this.bossBatSpawnTimer = undefined;
    this.mushroomPickup = undefined;
    this.hasMushroomPower = false;
    this.fireballs = undefined;
    this.nextFireballAt = 0;
    this.skipRepositionAfterDamage = false;
    this.applePickups = undefined;
    this.critterMovers = [];
    this.platformMovers = [];
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
    this.levelSkipTargetLevel = undefined;
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
    this.createTorches();
    this.createSkyRelightLayers();
    this.createLava();
    this.createControls();

    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.levelData.platforms) {
      const tile = this.platforms.create(platform.x, platform.y, "ground");
      const isLevel4Ground = this.levelData.theme === "castle" && this.levelNumber === 4 && platform.y >= 490;
      if (this.levelData.theme === "castle") {
        tile.setTexture(isLevel4Ground ? "ground" : "moldy-wall-tile");
        tile.clearTint();
      }
      tile.setDisplaySize(platform.width, platform.height);
      if (this.levelData.theme === "forest") {
        const isMainGroundLane = platform.y >= 500;
        tile.setTint(isMainGroundLane ? 0x8b5a3c : 0x6f8f52);
      }
      tile.refreshBody();

      if (isLevel4Ground) {
        const left = platform.x - platform.width / 2;
        const top = platform.y - platform.height / 2;
        for (let tx = left; tx < left + platform.width; tx += 32) {
          for (let ty = top; ty < top + platform.height; ty += 32) {
            this.add
              .image(tx, ty, "grass-tile")
              .setOrigin(0, 0)
              .setDisplaySize(32, 32)
              .setDepth(-1);
          }
        }
        this.add
          .rectangle(left, top, platform.width, platform.height, 0x000000, 0.25)
          .setOrigin(0, 0)
          .setDepth(-0.9);
      }
    }

    this.player = new Player(
      this,
      this.levelData.spawn.x,
      this.levelData.spawn.y,
      this.cursors
    );
    this.player.setRainbowPowerup(data?.hasRainbow ?? false);
    this.physics.add.collider(this.player, this.platforms);
    this.fireballs = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    this.createForestPuddles();
    this.createForestStumps();
    this.createFriendlyCritters();
    this.createLavaFlames();
    this.createStoryCat();

    if (this.levelData.rainbowPowerup) {
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
    }

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
    this.createMovingPlatforms();
    this.createApples();
    this.createBats();
    this.createBossWitch();
    this.createBossMushroomPowerup();

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

    keyboard.on("keydown-TWO", this.handleLevelTwoSkipKey, this);
    keyboard.on("keydown-THREE", this.handleLevelThreeSkipKey, this);
    keyboard.on("keydown-FOUR", this.handleLevelFourSkipKey, this);
    keyboard.on("keydown-R", this.handleResetKey, this);
    keyboard.on("keydown-ESC", this.handlePauseKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard.off("keydown-TWO", this.handleLevelTwoSkipKey, this);
      keyboard.off("keydown-THREE", this.handleLevelThreeSkipKey, this);
      keyboard.off("keydown-FOUR", this.handleLevelFourSkipKey, this);
      keyboard.off("keydown-R", this.handleResetKey, this);
      keyboard.off("keydown-ESC", this.handlePauseKey, this);
      this.levelSkipResetTimer?.remove(false);
      this.levelSkipResetTimer = undefined;
      this.levelSkipPressCount = 0;
      this.levelSkipTargetLevel = undefined;
    });
  }

  private handleResetKey(): void {
    if (!this.scene.isActive()) return;
    this.scene.stop("UIScene");
    this.scene.start("MenuScene");
  }

  private handlePauseKey(): void {
    if (!this.scene.isActive()) return;
    this.scene.launch("PauseScene", {
      maxLives: this.maxLives,
      difficulty: this.difficulty,
      levelNumber: this.levelNumber,
      currentLives: this.lives,
      hasRainbow: this.player?.hasRainbowPower() ?? false,
      levelTimes: [...this.levelTimes],
      menuTimeMs: this.menuTimeMs
    });
  }

  private handleLevelTwoSkipKey(): void {
    this.handleLevelSkipKey(2);
  }

  private handleLevelThreeSkipKey(): void {
    this.handleLevelSkipKey(3);
  }

  private handleLevelFourSkipKey(): void {
    this.handleLevelSkipKey(4);
  }

  private handleLevelSkipKey(targetLevel: number): void {
    if (!this.scene.isActive()) {
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

    if (this.levelNumber >= targetLevel) {
      return;
    }

    this.levelComplete = true;
    this.player?.setControlsEnabled(false);
    this.levelTimes.push(Date.now() - this.timerStartMs);
    const sceneData = {
      maxLives: this.maxLives,
      difficulty: this.difficulty,
      levelNumber: targetLevel,
      currentLives: this.lives,
      hasRainbow: this.player?.hasRainbowPower() ?? false,
      levelTimes: [...this.levelTimes],
      menuTimeMs: this.menuTimeMs
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
    this.tryShootFireball(time);
    this.updateFriendlyCritterPush();
    this.updateMovingPlatforms();
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
    this.updateBossWitch(time);

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

      // Foreground hero tree -- player walks behind it.
      this.add
        .image(2200, WORLD_HEIGHT + 10, "tree-krook")
        .setOrigin(0.5, 1)
        .setScale(1.2)
        .setDepth(100)
        .setScrollFactor(1);
      return;
    }

    if (this.levelData.theme === "castle") {
      this.baseSkyLayer = this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x2f2b45).setOrigin(0, 0);
      this.baseHorizonLayer = this.add
        .rectangle(0, WORLD_HEIGHT - 160, WORLD_WIDTH, 160, 0x3d3860, 0.35)
        .setOrigin(0, 0);

      const castleImage = this.textures.get("castle-bg").getSourceImage() as { width: number; height: number };
      const layerHeight = 200;
      const scale = layerHeight / Math.max(1, castleImage.height);
      const layerWidth = Math.max(150, castleImage.width * scale);
      for (let x = -60; x < WORLD_WIDTH + layerWidth; x += layerWidth - 20) {
        this.add
          .image(x, WORLD_HEIGHT - 60, "castle-bg")
          .setOrigin(0, 1)
          .setScale(scale)
          .setAlpha(0.18)
          .setTint(0x6c6887)
          .setScrollFactor(0.15);
      }

      for (let i = 0; i < 5; i += 1) {
        const x = 300 + i * 700;
        const towerKey = i % 2 === 0 ? "castle-tower" : "castle-tower-damaged";
        this.add
          .image(x, WORLD_HEIGHT - 70, towerKey)
          .setOrigin(0.5, 1)
          .setScale(0.55)
          .setAlpha(0.2)
          .setTint(0x6a6588)
          .setScrollFactor(0.18);
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

  private createTorches(): void {
    if (this.levelData.theme !== "castle") {
      return;
    }

    if (!this.anims.exists("torch-flicker")) {
      this.anims.create({
        key: "torch-flicker",
        frames: this.anims.generateFrameNumbers("torch", { start: 0, end: 2 }),
        frameRate: 6,
        repeat: -1
      });
    }

    // Use torches sparingly so the scene stays readable.
    const bottomPlatforms = this.levelData.platforms.filter(p => p.y >= 490);
    const torchPlatforms = bottomPlatforms.filter((_, index) => index % 3 === 1);
    for (const platform of torchPlatforms) {
      const torchY = platform.y - platform.height / 2;
      const torch = this.add
        .sprite(platform.x, torchY, "torch", 0)
        .setOrigin(0.5, 1)
        .setScale(0.18)
        .setAlpha(0.9)
        .setDepth(-1);
      torch.play({ key: "torch-flicker", startFrame: Phaser.Math.Between(0, 2) });

      this.add
        .ellipse(platform.x, torchY + 2, 30, 10, 0xffa030, 0.12)
        .setDepth(-2);
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
    if (!this.levelData.apples?.length) {
      return;
    }

    this.applePickups = this.physics.add.group();
    for (const appleData of this.levelData.apples) {
      const apple = this.applePickups
        .create(appleData.x, appleData.y, "apple-pickup") as Phaser.Physics.Arcade.Image;
      apple.setOrigin(0.5, 1)
        .setDisplaySize(appleData.width, appleData.height)
        .setDepth(9);
      const body = apple.body as Phaser.Physics.Arcade.Body;
      body.setSize(appleData.width, appleData.height);
      body.setBounce(0);
    }

    this.physics.add.collider(this.applePickups, this.platforms);
    for (const mover of this.platformMovers) {
      this.physics.add.collider(this.applePickups, mover.image);
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

  private createMovingPlatforms(): void {
    if (!this.levelData.movingPlatforms?.length) {
      return;
    }

    const textureKey =
      this.levelData.theme === "castle" ? "moldy-wall-tile" : "ground";

    for (const mp of this.levelData.movingPlatforms) {
      const image = this.physics.add
        .image(mp.x, mp.y, textureKey)
        .setDisplaySize(mp.width, mp.height);
      if (this.levelData.theme === "forest") {
        image.setTint(0x6f8f52);
      }

      const body = image.body as Phaser.Physics.Arcade.Body;
      body.setImmovable(true);
      body.setAllowGravity(false);

      this.physics.add.collider(this.player, image);
      for (const snake of this.snakes) {
        this.physics.add.collider(snake, image);
      }

      this.tweens.add({
        targets: image,
        x: mp.x + (mp.moveX ?? 0),
        y: mp.y + (mp.moveY ?? 0),
        duration: mp.duration ?? 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });

      this.platformMovers.push({ image, prevX: mp.x, prevY: mp.y });
    }
  }

  private updateMovingPlatforms(): void {
    if (!this.platformMovers.length) {
      return;
    }
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    for (const mover of this.platformMovers) {
      const dx = mover.image.x - mover.prevX;
      const dy = mover.image.y - mover.prevY;
      mover.prevX = mover.image.x;
      mover.prevY = mover.image.y;

      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        continue;
      }
      if (!playerBody.touching.down && !playerBody.blocked.down) {
        continue;
      }

      const platBody = mover.image.body as Phaser.Physics.Arcade.Body;
      const playerRight = playerBody.x + playerBody.width;
      const playerLeft = playerBody.x;
      const platRight = platBody.x + platBody.width;
      const platLeft = platBody.x;
      if (playerRight < platLeft || playerLeft > platRight) {
        continue;
      }

      const playerBottom = playerBody.y + playerBody.height;
      if (Math.abs(playerBottom - platBody.y) > 8) {
        continue;
      }

      playerBody.x += dx;
      if (Math.abs(dy) > 0.05) {
        playerBody.y += dy;
      }
    }
  }

  private createBats(): void {
    if (!this.levelData.bats?.length) {
      return;
    }

    if (!this.anims.exists("bat-fly")) {
      this.anims.create({
        key: "bat-fly",
        frames: this.anims.generateFrameNumbers("bat", { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }

    for (const batData of this.levelData.bats) {
      const bat = this.physics.add
        .sprite(batData.x, batData.y, "bat", 0)
        .setScale(1.2)
        .setDepth(8);
      const body = bat.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);
      body.setSize(20, 18);
      bat.play("bat-fly");

      const halfPatrol = batData.patrolWidth / 2;
      const speed = batData.speed ?? 1;
      const duration = Math.abs(batData.patrolWidth / speed) * 16;

      this.tweens.add({
        targets: bat,
        x: batData.x + halfPatrol,
        duration,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        onUpdate: (_tween, target, _key, current, previous) => {
          if (target !== bat) {
            return;
          }
          bat.setFlipX(current < previous);
        }
      });
      bat.x = batData.x - halfPatrol;

      this.physics.add.overlap(this.player, bat, this.handlePlayerHit, undefined, this);
      this.batSprites.push(bat);
    }
  }

  private createBossWitch(): void {
    const bossData = this.levelData.bossWitch;
    if (!bossData) {
      return;
    }

    if (!this.anims.exists("witch-fly")) {
      this.anims.create({
        key: "witch-fly",
        frames: this.anims.generateFrameNumbers("witch", { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!this.anims.exists("bat-fly")) {
      this.anims.create({
        key: "bat-fly",
        frames: this.anims.generateFrameNumbers("bat", { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }

    const witch = this.physics.add
      .sprite(bossData.x, bossData.y, "witch", 0)
      .setScale(1.6)
      .setDepth(12);
    const body = witch.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(30, 22);
    witch.play("witch-fly");

    const halfPatrol = bossData.patrolWidth / 2;
    const speed = bossData.speed ?? 1.1;
    const horizontalDuration = Math.max(1500, Math.abs(bossData.patrolWidth / speed) * 18);
    this.tweens.add({
      targets: witch,
      x: bossData.x + halfPatrol,
      duration: horizontalDuration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onUpdate: (_tween, target, _key, current, previous) => {
        if (target !== witch) {
          return;
        }
        witch.setFlipX(current < previous);
      }
    });
    witch.x = bossData.x - halfPatrol;

    const verticalTravel = Math.abs(bossData.moveY ?? 38);
    this.tweens.add({
      targets: witch,
      y: bossData.y - verticalTravel,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.bossWitch = witch;
    this.bossHealth = BOSS_HEALTH_BY_DIFFICULTY[this.difficulty];
    this.bossInvulnerableUntil = 0;
    this.updateBossHealthText();
    this.bossBatSpawnTimer = this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => this.spawnBossBat()
    });
    this.physics.add.overlap(this.player, witch, this.handleBossWitchCollision, undefined, this);
  }

  private spawnBossBat(): void {
    if (!this.bossWitch || !this.bossWitch.active || !this.player?.active || this.levelComplete) {
      return;
    }
    const bat = this.physics.add
      .sprite(this.bossWitch.x, this.bossWitch.y + 2, "bat", 0)
      .setScale(1.05)
      .setDepth(10);
    bat.setData("bossBat", true);
    const body = bat.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(20, 18);
    bat.play("bat-fly");

    const dx = this.player.x - bat.x;
    const dy = (this.player.y - 30) - bat.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const speed = 175;
    body.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    bat.setFlipX(body.velocity.x < 0);
    this.physics.add.overlap(this.player, bat, this.handlePlayerHit, undefined, this);
    this.time.delayedCall(3200, () => bat.destroy());
  }

  private createBossMushroomPowerup(): void {
    const mushroomData = this.levelData.bossMushroom;
    if (!mushroomData) {
      return;
    }
    this.mushroomPickup = this.physics.add
      .staticImage(mushroomData.x, mushroomData.y, "mushroom-powerup")
      .setOrigin(0.5, 1)
      .setDisplaySize(mushroomData.width, mushroomData.height)
      .setDepth(10);
    this.physics.add.overlap(
      this.player,
      this.mushroomPickup,
      this.handleMushroomCollect,
      undefined,
      this
    );
  }

  private handleMushroomCollect(): void {
    if (!this.mushroomPickup || !this.mushroomPickup.active) {
      return;
    }
    this.mushroomPickup.destroy();
    this.mushroomPickup = undefined;
    this.hasMushroomPower = true;
    this.game.events.emit(GAME_EVENTS.mushroomPowerupCollected);
    if (this.audioContext) {
      beep(this.audioContext, 560, 0.1, "triangle", 0.03);
    }
  }

  private tryShootFireball(time: number): void {
    if (!this.hasMushroomPower || !this.fireballKey || !this.fireballs) {
      return;
    }
    if (time < this.nextFireballAt || !Phaser.Input.Keyboard.JustDown(this.fireballKey)) {
      return;
    }
    this.nextFireballAt = time + 220;

    const dir = this.player.flipX ? -1 : 1;
    const fireball = this.fireballs.create(
      this.player.x + dir * 26,
      this.player.y - 26,
      "lava-flame"
    ) as Phaser.Physics.Arcade.Image;
    fireball
      .setDepth(11)
      .setScale(0.55)
      .setFlipX(dir < 0)
      .setTint(0xffe38a);
    const body = fireball.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocity(460 * dir, 0);
    body.setSize(Math.max(10, fireball.width * 0.4), Math.max(10, fireball.height * 0.4), true);

    if (this.bossWitch?.active) {
      this.physics.add.overlap(fireball, this.bossWitch, this.handleFireballHitBoss, undefined, this);
    }
    this.time.delayedCall(1600, () => fireball.destroy());
    if (this.audioContext) {
      beep(this.audioContext, 700, 0.05, "triangle", 0.02);
    }
  }

  private handleFireballHitBoss(
    fireballObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
  ): void {
    const fireball = fireballObject as Phaser.GameObjects.GameObject | undefined;
    fireball?.destroy();
    if (!this.bossWitch || !this.bossWitch.active || this.time.now < this.bossInvulnerableUntil) {
      return;
    }
    this.bossInvulnerableUntil = this.time.now + 260;
    this.bossHealth -= 1;
    this.updateBossHealthText();
    this.bossWitch.setTint(0xff956c);
    this.time.delayedCall(100, () => this.bossWitch?.clearTint());
    if (this.audioContext) {
      beep(this.audioContext, 820, 0.08, "triangle", 0.03);
    }
    if (this.bossHealth > 0) {
      return;
    }
    this.triggerBossDefeat();
  }

  private updateBossWitch(time: number): void {
    if (!this.bossWitch || !this.bossWitch.active) {
      return;
    }
    if (time < this.bossInvulnerableUntil) {
      this.bossWitch.setAlpha(Math.sin(time / 28) > 0 ? 0.45 : 1);
      return;
    }
    this.bossWitch.setAlpha(1);
  }

  private updateBossHealthText(): void {
    if (!this.bossWitch || !this.bossWitch.active || this.bossHealth <= 0) {
      for (const heart of this.bossHeartSprites) {
        heart.destroy();
      }
      this.bossHeartSprites = [];
      return;
    }

    while (this.bossHeartSprites.length < this.bossHealth) {
      const heart = this.add
        .image(0, 44, "hearts", 0)
        .setScale(0.06)
        .setScrollFactor(0)
        .setDepth(1002)
        .setTint(0xc27bff);
      this.bossHeartSprites.push(heart);
    }
    while (this.bossHeartSprites.length > this.bossHealth) {
      this.bossHeartSprites.pop()?.destroy();
    }

    const spacing = 30;
    const rightMargin = 30;
    const y = 30;
    for (let i = 0; i < this.bossHeartSprites.length; i += 1) {
      const x = GAME_WIDTH - rightMargin - i * spacing;
      this.bossHeartSprites[i].setPosition(x, y);
    }
  }

  private triggerBossDefeat(): void {
    if (!this.bossWitch || !this.bossWitch.active) {
      return;
    }

    const witch = this.bossWitch;
    this.bossBatSpawnTimer?.remove(false);
    this.bossBatSpawnTimer = undefined;
    this.bossInvulnerableUntil = Number.MAX_SAFE_INTEGER;
    this.bossHealth = 0;
    this.updateBossHealthText();

    const blast = this.add.circle(witch.x, witch.y - 8, 14, 0xffc07a, 0.8).setDepth(14);
    this.tweens.add({
      targets: blast,
      scale: 4,
      alpha: 0,
      duration: 260,
      ease: "Cubic.easeOut",
      onComplete: () => blast.destroy()
    });

    for (let i = 0; i < 14; i += 1) {
      const spark = this.add
        .circle(witch.x, witch.y - 8, Phaser.Math.Between(2, 4), 0xff9a5c, 0.95)
        .setDepth(14);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(30, 85);
      this.tweens.add({
        targets: spark,
        x: spark.x + Math.cos(angle) * distance,
        y: spark.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: Phaser.Math.Between(220, 360),
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy()
      });
    }

    this.tweens.add({
      targets: witch,
      alpha: 0,
      scaleX: witch.scaleX * 1.8,
      scaleY: witch.scaleY * 1.8,
      angle: 18,
      duration: 240,
      ease: "Back.easeIn",
      onComplete: () => {
        witch.destroy();
        this.bossWitch = undefined;
        this.bossInvulnerableUntil = 0;
        this.updateGateUnlockState();
      }
    });

    this.cameras.main.shake(220, 0.0045);
    if (this.audioContext) {
      beep(this.audioContext, 980, 0.1, "triangle", 0.04);
      this.time.delayedCall(90, () => beep(this.audioContext!, 760, 0.09, "square", 0.03));
    }
  }

  private handleBossWitchCollision(
    playerObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    witchObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
  ): void {
    if (!this.scene.isActive() || !this.player.body || this.levelComplete) {
      return;
    }
    if (!this.bossWitch || !this.bossWitch.active) {
      return;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const stompedFromAbove = playerBody.velocity.y > 110 && playerBody.bottom <= this.bossWitch.y - 8;
    if (!stompedFromAbove) {
      this.handlePlayerHit(playerObject, witchObject);
      return;
    }
    if (this.time.now < this.bossInvulnerableUntil) {
      return;
    }

    this.bossInvulnerableUntil = this.time.now + 420;
    this.bossHealth -= 1;
    this.updateBossHealthText();
    this.player.setVelocityY(-420);
    this.bossWitch.setTint(0xffd36a);
    this.time.delayedCall(120, () => this.bossWitch?.clearTint());
    if (this.audioContext) {
      beep(this.audioContext, 760, 0.08, "triangle", 0.03);
    }

    if (this.bossHealth > 0) {
      return;
    }
    this.triggerBossDefeat();
  }

  private createStoryCat(): void {
    if (this.levelData.theme !== "forest" || !this.levelData.storyCat) {
      return;
    }

    if (!this.anims.exists("cat-idle")) {
      this.anims.create({
        key: "cat-idle",
        frames: this.anims.generateFrameNumbers("story-cat-idle", { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1
      });
    }

    const cat = this.physics.add
      .sprite(this.levelData.storyCat.x, this.levelData.storyCat.y, "story-cat-idle", 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(this.levelData.storyCat.width, this.levelData.storyCat.height)
      .setDepth(9);
    const catBody = cat.body as Phaser.Physics.Arcade.Body;
    catBody.setImmovable(true);
    catBody.setAllowGravity(false);
    cat.play("cat-idle");
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
      .image(portraitCenterX, portraitCenterY, "story-cat-idle", 0)
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
    const jumpKey = baseCursors?.up;
    this.fireballKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const wasd = this.input.keyboard?.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D
    });
    if (
      !baseCursors ||
      !jumpKey ||
      !this.fireballKey ||
      !wasd ||
      !("w" in wasd) ||
      !("a" in wasd) ||
      !("s" in wasd) ||
      !("d" in wasd)
    ) {
      throw new Error("Keyboard not available");
    }
    this.cursors = {
      ...baseCursors,
      jump: jumpKey,
      w: wasd.w as Phaser.Input.Keyboard.Key,
      a: wasd.a as Phaser.Input.Keyboard.Key,
      s: wasd.s as Phaser.Input.Keyboard.Key,
      d: wasd.d as Phaser.Input.Keyboard.Key
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
    spawnRainbowTrail(
      this,
      this.player.x + tailDirection * 16,
      this.player.y - 10,
      tailDirection,
      this.player.depth + 2
    );
  }

  private updateGateUnlockState(): void {
    if (this.gateUnlocked) {
      return;
    }
    if (this.bossWitch?.active) {
      return;
    }
    if (this.collectibleSystem.getCollectedCount() < this.requiredSparklesToFinish) {
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
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (!playerBody) {
      return;
    }

    this.canTakeDamageAt = this.time.now + PLAYER_HIT_INVULNERABILITY_MS;
    this.game.events.emit(GAME_EVENTS.playerHit);

    if (this.player.hasRainbowPower()) {
      this.player.setRainbowPowerup(false);
      this.game.events.emit(GAME_EVENTS.rainbowPowerupLost);
      if (this.audioContext) {
        beep(this.audioContext, 300, 0.12, "square", 0.03);
      }
      this.knockbackPlayer(hazard, 0xffd998);
      this.time.delayedCall(260, () => this.recoverPlayer());
      return;
    }

    this.lives -= 1;
    this.game.events.emit(GAME_EVENTS.livesChanged, this.lives);
    const isBossBatHit =
      this.levelNumber === 4 &&
      typeof hazard === "object" &&
      hazard !== null &&
      "getData" in hazard &&
      typeof (hazard as Phaser.GameObjects.GameObject).getData === "function" &&
      Boolean((hazard as Phaser.GameObjects.GameObject).getData("bossBat"));
    this.skipRepositionAfterDamage = isBossBatHit;
    if (this.audioContext) {
      beep(this.audioContext, 180, 0.16, "sawtooth", 0.045);
    }
    this.knockbackPlayer(hazard, 0xff8da8);
    this.time.delayedCall(260, () => this.recoverAfterDamage());
  }

  private knockbackPlayer(
    hazard:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    tintColor: number
  ): void {
    this.player.setControlsEnabled(false);
    this.player.setTint(tintColor);
    const hazardX =
      typeof hazard === "object" && hazard !== null && "x" in hazard
        ? (hazard.x as number)
        : this.player.x;
    const direction = this.player.x < hazardX ? -1 : 1;
    this.player.setVelocityX(direction * 220);
    this.player.setVelocityY(-250);
  }

  private recoverPlayer(): void {
    if (!this.scene.isActive() || !this.player || !this.player.active) {
      return;
    }
    this.player.clearTint();
    this.player.setControlsEnabled(true);
  }

  private recoverAfterDamage(): void {
    if (!this.scene.isActive() || !this.player || !this.player.active) {
      return;
    }
    if (this.lives <= 0) {
      this.game.events.emit(GAME_EVENTS.gameOver);
      this.scene.stop("UIScene");
      const allTimes = [...this.levelTimes, Date.now() - this.timerStartMs];
      this.scene.start("GameOverScene", {
        maxLives: this.maxLives,
        difficulty: this.difficulty,
        levelNumber: this.levelNumber,
        levelTimes: allTimes,
        menuTimeMs: this.menuTimeMs
      });
      return;
    }

    if (this.skipRepositionAfterDamage) {
      this.skipRepositionAfterDamage = false;
      this.player.clearTint();
      this.player.setControlsEnabled(true);
      return;
    }

    const spawn = this.checkpointSystem?.getActiveSpawn();
    if (spawn) {
      this.player.resetAt(spawn.x, spawn.y);
    } else {
      this.player.clearTint();
    }
    this.player.setControlsEnabled(true);
  }

  private tryFinishLevel(): void {
    if (this.levelComplete) {
      return;
    }
    if (!this.gateUnlocked) {
      this.cameras.main.shake(120, 0.0025);
      if (this.audioContext) {
        beep(this.audioContext, 230, 0.09, "square", 0.03);
      }
      return;
    }

    const collected = this.collectibleSystem.getCollectedCount();
    if (collected < this.requiredSparklesToFinish) {
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
    this.levelTimes.push(Date.now() - this.timerStartMs);
    this.time.delayedCall(500, () => {
      if (this.levelNumber < LEVEL_COUNT) {
        const sceneData = {
          maxLives: this.maxLives,
          difficulty: this.difficulty,
          levelNumber: this.levelNumber + 1,
          currentLives: this.lives,
          hasRainbow: this.player.hasRainbowPower(),
          levelTimes: [...this.levelTimes],
          menuTimeMs: this.menuTimeMs
        };
        this.scene.restart(sceneData);
        this.scene.launch("UIScene", sceneData);
        return;
      }

      this.scene.start("WinScene", {
        sparkles: collected,
        levelTimes: [...this.levelTimes],
        menuTimeMs: this.menuTimeMs
      });
    });
  }
}
