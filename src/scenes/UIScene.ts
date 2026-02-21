import Phaser from "phaser";
import { GAME_EVENTS } from "../config/events";
import { GAME_WIDTH, getRequiredSparklesToFinish } from "../config/gameConfig";
import { formatTime } from "../utils/formatTime";
import { beep } from "../utils/sfx";

export class UIScene extends Phaser.Scene {
  private heartSprites: Phaser.GameObjects.Image[] = [];
  private sparkleIcon!: Phaser.GameObjects.Image;
  private sparkleCountText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hideHintTimer?: Phaser.Time.TimerEvent;
  private timerText!: Phaser.GameObjects.Text;
  private timerStartMs = 0;
  private audioContext?: AudioContext;
  private maxLives = 5;
  private requiredSparklesToFinish = getRequiredSparklesToFinish(1);

  constructor() {
    super("UIScene");
  }

  create(data?: { maxLives?: number; levelNumber?: number }): void {
    this.heartSprites = [];
    this.hideHintTimer?.remove(false);
    this.hideHintTimer = undefined;

    this.maxLives = data?.maxLives ?? 5;
    this.timerStartMs = Date.now();
    this.requiredSparklesToFinish = getRequiredSparklesToFinish(data?.levelNumber ?? 1);
    this.audioContext = "context" in this.sound ? (this.sound.context as AudioContext) : undefined;
    for (let i = 0; i < this.maxLives; i += 1) {
      const heart = this.add
        .image(30 + i * 30, 30, "hearts", 0)
        .setScale(0.06)
        .setScrollFactor(0);
      this.heartSprites.push(heart);
    }
    this.sparkleIcon = this.add.image(28, 64, "sparkle").setScale(0.72).setScrollFactor(0);
    this.sparkleCountText = this.add.text(46, 52, `0 / ${this.requiredSparklesToFinish}`, {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#fff7b1",
      stroke: "#24133d",
      strokeThickness: 5
    }).setScrollFactor(0);
    this.timerText = this.add.text(GAME_WIDTH / 2, 16, "0:00.0", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#e0daf8",
      stroke: "#24133d",
      strokeThickness: 4
    }).setOrigin(0.5, 0).setScrollFactor(0);
    this.hintText = this.add.text(GAME_WIDTH - 16, 16, "", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#ccf5ff",
      stroke: "#24133d",
      strokeThickness: 4
    }).setOrigin(1, 0).setScrollFactor(0);

    this.game.events.on(GAME_EVENTS.livesChanged, this.onLivesChanged, this);
    this.game.events.on(GAME_EVENTS.sparkleChanged, this.onSparkleChanged, this);
    this.game.events.on(
      GAME_EVENTS.rainbowPowerupCollected,
      this.onRainbowPowerupCollected,
      this
    );
    this.game.events.on(GAME_EVENTS.rainbowPowerupLost, this.onRainbowPowerupLost, this);
    this.game.events.on(GAME_EVENTS.mushroomPowerupCollected, this.onMushroomPowerupCollected, this);
    this.game.events.on(GAME_EVENTS.checkpointReached, this.onCheckpointReached, this);
    this.game.events.on(GAME_EVENTS.playerHit, this.onPlayerHit, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GAME_EVENTS.livesChanged, this.onLivesChanged, this);
      this.game.events.off(GAME_EVENTS.sparkleChanged, this.onSparkleChanged, this);
      this.game.events.off(
        GAME_EVENTS.rainbowPowerupCollected,
        this.onRainbowPowerupCollected,
        this
      );
      this.game.events.off(GAME_EVENTS.rainbowPowerupLost, this.onRainbowPowerupLost, this);
      this.game.events.off(
        GAME_EVENTS.mushroomPowerupCollected,
        this.onMushroomPowerupCollected,
        this
      );
      this.game.events.off(GAME_EVENTS.checkpointReached, this.onCheckpointReached, this);
      this.game.events.off(GAME_EVENTS.playerHit, this.onPlayerHit, this);
    });
  }

  update(): void {
    this.timerText.setText(formatTime(Date.now() - this.timerStartMs));
  }

  private onLivesChanged(lives: number): void {
    this.ensureHeartSlots(lives);
    for (let i = 0; i < this.heartSprites.length; i += 1) {
      const heart = this.heartSprites[i];
      heart.setTexture("hearts", 0);
      if (i < lives) {
        heart.clearTint();
        heart.setAlpha(1);
      } else {
        heart.setTint(0x705f8c);
        heart.setAlpha(0.45);
      }
    }
  }

  private ensureHeartSlots(requiredSlots: number): void {
    while (this.heartSprites.length < requiredSlots) {
      const i = this.heartSprites.length;
      const heart = this.add
        .image(30 + i * 30, 30, "hearts", 0)
        .setScale(0.06)
        .setScrollFactor(0);
      this.heartSprites.push(heart);
    }
  }

  private onSparkleChanged(count: number): void {
    this.sparkleCountText.setText(`${count} / ${this.requiredSparklesToFinish}`);
    if (count >= this.requiredSparklesToFinish) {
      this.hintText.setText("Gate unlocked! Reach the rainbow!");
      this.hintText.setColor("#9fffb8");
      this.hintText.setStroke("#223a2f", 4);
    }
    if (this.audioContext) {
      beep(this.audioContext, 540 + Math.min(count, 10) * 20, 0.08, "triangle", 0.026);
    }
  }

  private onCheckpointReached(): void {
    this.hintText.setText("Checkpoint saved!");
    this.hintText.setColor("#ffe6a8");
    this.hintText.setStroke("#4d3b1b", 4);
    this.resetHintSoon();
    if (this.audioContext) {
      beep(this.audioContext, 700, 0.08, "triangle", 0.025);
    }
  }

  private onRainbowPowerupCollected(): void {
    this.hintText.setText("Rainbow power! Double jump unlocked!");
    this.hintText.setColor("#ffd7ff");
    this.hintText.setStroke("#5a2a63", 4);
    this.resetHintSoon();
    if (this.audioContext) {
      beep(this.audioContext, 760, 0.08, "triangle", 0.026);
    }
  }

  private onRainbowPowerupLost(): void {
    this.hintText.setText("Ouch! Rainbow power lost!");
    this.hintText.setColor("#ffd0a1");
    this.hintText.setStroke("#5a361f", 4);
    this.resetHintSoon();
  }

  private onMushroomPowerupCollected(): void {
    this.hintText.setText("Mushroom power! Press Space to shoot fireballs!");
    this.hintText.setColor("#ffd6a1");
    this.hintText.setStroke("#5a2f1f", 4);
    this.resetHintSoon();
  }

  private onPlayerHit(): void {
    this.cameras.main.shake(120, 0.0035);
  }

  private resetHintSoon(): void {
    this.hideHintTimer?.remove(false);
    this.hideHintTimer = this.time.delayedCall(1800, () => {
      this.hintText.setText("");
      this.hintText.setColor("#ccf5ff");
      this.hintText.setStroke("#24133d", 4);
    });
  }
}
