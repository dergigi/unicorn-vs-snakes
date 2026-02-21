import Phaser from "phaser";
import { GAME_EVENTS } from "../config/events";
import {
  GAME_WIDTH,
  MAX_LIVES,
  REQUIRED_SPARKLES_TO_FINISH
} from "../config/gameConfig";
import { beep } from "../utils/sfx";

export class UIScene extends Phaser.Scene {
  private heartSprites: Phaser.GameObjects.Image[] = [];
  private sparkleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hideHintTimer?: Phaser.Time.TimerEvent;
  private audioContext?: AudioContext;

  constructor() {
    super("UIScene");
  }

  create(): void {
    this.audioContext = "context" in this.sound ? (this.sound.context as AudioContext) : undefined;
    for (let i = 0; i < MAX_LIVES; i += 1) {
      const heart = this.add
        .image(30 + i * 30, 30, "hearts", 0)
        .setScale(0.06)
        .setScrollFactor(0);
      this.heartSprites.push(heart);
    }
    this.sparkleText = this.add.text(18, 44, "✦ 0 / 14", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#fff7b1",
      stroke: "#24133d",
      strokeThickness: 5
    }).setScrollFactor(0);
    this.hintText = this.add.text(GAME_WIDTH - 16, 16, "Arrow keys + Space", {
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
      this.game.events.off(GAME_EVENTS.checkpointReached, this.onCheckpointReached, this);
      this.game.events.off(GAME_EVENTS.playerHit, this.onPlayerHit, this);
    });
  }

  private onLivesChanged(lives: number): void {
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

  private onSparkleChanged(count: number): void {
    this.sparkleText.setText(`✦ ${count} / ${REQUIRED_SPARKLES_TO_FINISH}`);
    if (count >= REQUIRED_SPARKLES_TO_FINISH) {
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

  private onPlayerHit(): void {
    this.cameras.main.shake(120, 0.0035);
  }

  private resetHintSoon(): void {
    this.hideHintTimer?.remove(false);
    this.hideHintTimer = this.time.delayedCall(1800, () => {
      this.hintText.setText("Arrow keys + Space");
      this.hintText.setColor("#ccf5ff");
      this.hintText.setStroke("#24133d", 4);
    });
  }
}
