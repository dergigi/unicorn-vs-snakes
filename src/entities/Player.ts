import Phaser from "phaser";
import {
  COYOTE_TIME_MS,
  JUMP_BUFFER_MS,
  PLAYER_JUMP_VELOCITY,
  PLAYER_MAX_FALL_SPEED,
  PLAYER_MOVE_SPEED
} from "../config/gameConfig";

type Cursors = Phaser.Types.Input.Keyboard.CursorKeys & {
  jump: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Cursors;
  private lastGroundedAt = 0;
  private lastJumpPressedAt = -9999;
  private controlsEnabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, cursors: Cursors) {
    super(scene, x, y, "unicorn");
    this.cursors = cursors;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setOrigin(0.5, 1);
    this.setScale(0.8);
    this.setCollideWorldBounds(true);
    body.setSize(24, 30, true);
    body.setOffset(4, 2);
  }

  public setControlsEnabled(enabled: boolean): void {
    this.controlsEnabled = enabled;
    if (!enabled) {
      this.setVelocityX(0);
    }
  }

  public resetAt(x: number, y: number): void {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.clearTint();
    this.setAlpha(1);
  }

  public update(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const isGrounded = body.blocked.down || body.touching.down;

    if (isGrounded) {
      this.lastGroundedAt = time;
    }

    if (!this.controlsEnabled) {
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.jump) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up)
    ) {
      this.lastJumpPressedAt = time;
    }

    let velocityX = 0;
    if (this.cursors.left?.isDown) {
      velocityX = -PLAYER_MOVE_SPEED;
      this.setFlipX(false);
    } else if (this.cursors.right?.isDown) {
      velocityX = PLAYER_MOVE_SPEED;
      this.setFlipX(true);
    }
    this.setVelocityX(velocityX);

    const canUseCoyote = time - this.lastGroundedAt <= COYOTE_TIME_MS;
    const jumpBuffered = time - this.lastJumpPressedAt <= JUMP_BUFFER_MS;
    if (canUseCoyote && jumpBuffered) {
      this.setVelocityY(PLAYER_JUMP_VELOCITY);
      this.lastJumpPressedAt = -9999;
      this.lastGroundedAt = -9999;
    }

    if (body.velocity.y > PLAYER_MAX_FALL_SPEED) {
      body.velocity.y = PLAYER_MAX_FALL_SPEED;
    }

    if (Math.abs(velocityX) > 0) {
      const gallopSway = Math.sin(time * 0.01) * 2.2;
      this.setAngle(gallopSway);
    } else {
      this.setAngle(0);
    }
  }
}
